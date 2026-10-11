/**
 * server.js — The back-end (Express web server + REST API)
 * ---------------------------------------------------------
 * This is the program you run. It does two jobs:
 *
 *  1. Serves the front-end (everything in the /public folder)
 *     at http://localhost:3000
 *
 *  2. Provides a small REST API that the front-end calls with
 *     fetch() to read and write registration data:
 *
 *       GET    /api/registrations       → list all records   (admin only)
 *       POST   /api/registrations       → create a new record (public)
 *       PUT    /api/registrations/:id   → update a record     (admin only)
 *       DELETE /api/registrations/:id   → delete a record     (admin only)
 *
 * Three kinds of visitor use this API, and each gets a different level
 * of access — this is the security model in one paragraph:
 *
 *   PUBLIC   anyone on the internet. Can create a registration and can
 *            sign a student up if they hold a valid link token. Cannot
 *            read anybody's data.
 *   TEACHER  holds the secret token from their own shareable link. Can
 *            see and manage ONLY their own class — no password needed,
 *            because the unguessable token IS the credential.
 *   ADMIN    logged in with the admin password. Can see everything.
 *
 * "REST API" just means: the front-end and back-end talk by
 * sending JSON over HTTP, using the URL to say WHICH record and
 * the method (GET/POST/PUT/DELETE) to say WHAT to do with it.
 *
 * To run:   node server.js
 * To stop:  Ctrl + C
 */

// Read the local .env file and copy its settings into process.env.
// This MUST run before anything else looks at process.env, which is why
// it is the very first line of the program. Secrets (the admin password
// hash, the cookie-signing secret) live in .env — a file that is NOT in
// git — so they never end up in the repository. See .env.example.
require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');            // admin PDF export
const bcrypt = require('bcryptjs');           // password hashing (pure JS, no build step)
const cookieParser = require('cookie-parser'); // reads/writes the admin session cookie
const { rateLimit, ipKeyGenerator } = require('express-rate-limit'); // caps how often one IP can hit a route
const db = require('./db'); // our database module (creates the table on first run)
const EVENT_DAYS = require('./public/event-days.js');
const { sendConfirmationEmail } = require('./email'); // confirmation emails (logs only until a provider is set up)

const app = express();

// The port can be changed with PORT in .env; 3000 is the normal default.
const PORT = Number(process.env.PORT) || 3000;

// --- Admin configuration --------------------------------------------
/**
 * Two secrets come from .env:
 *
 *  ADMIN_PASSWORD_HASH — a bcrypt hash of the admin password. We store a
 *    HASH, never the password itself, so that even someone who reads the
 *    .env file cannot simply read the password out of it.
 *  SESSION_SECRET — a long random string used to SIGN the login cookie.
 *    Signing means the browser gets the cookie value plus a short
 *    signature computed from this secret. A visitor can read or delete
 *    their cookie, but they cannot forge a new one, because they don't
 *    know the secret. That is what stops someone typing a fake
 *    "I am the admin" cookie into their browser.
 */
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const ADMIN_CONFIGURED = Boolean(ADMIN_PASSWORD_HASH && SESSION_SECRET);

if (!ADMIN_CONFIGURED) {
  // A loud, unmissable warning — but NOT a crash. The public pages
  // (home, registration, student sign-up) still need to work; only the
  // admin dashboard is unavailable. Admin login "fails closed": with no
  // configuration it always refuses, it never accidentally lets someone in.
  console.warn('');
  console.warn('  ****************************************************************');
  console.warn('  *  WARNING: the admin dashboard is NOT configured.             *');
  console.warn('  *                                                              *');
  console.warn('  *  Admin login will refuse every attempt until you fix this.   *');
  console.warn('  *  The rest of the site works normally.                        *');
  console.warn('  *                                                              *');
  console.warn('  *  To fix it:                                                  *');
  console.warn('  *    1. Copy .env.example to .env                              *');
  console.warn('  *    2. Generate a password hash:                              *');
  console.warn('  *       node -e "console.log(require(\'bcryptjs\')' +
               '.hashSync(process.argv[1], 10))" \'YourPassword\'   *');
  console.warn('  *    3. Generate a session secret:                             *');
  console.warn('  *       node -e "console.log(require(\'crypto\')' +
               '.randomBytes(32).toString(\'hex\'))"          *');
  console.warn('  *    4. Paste both into .env and restart the server.           *');
  console.warn('  ****************************************************************');
  console.warn('');
  if (!ADMIN_PASSWORD_HASH) console.warn('  Missing: ADMIN_PASSWORD_HASH');
  if (!SESSION_SECRET) console.warn('  Missing: SESSION_SECRET');
  console.warn('');
}

// The name and settings of the admin login cookie, written down once so
// that setting it (on login) and clearing it (on logout) can never drift
// apart — a cookie is only cleared if the options match how it was set.
const ADMIN_COOKIE_NAME = 'pou_hono_admin';
const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,  // JavaScript in the page cannot read it — blunts XSS cookie theft
  signed: true,    // signed with SESSION_SECRET, so it cannot be forged
  sameSite: 'lax', // not sent on cross-site POSTs — basic CSRF protection
  secure: process.env.NODE_ENV === 'production', // HTTPS-only in production
  maxAge: 8 * 60 * 60 * 1000 // 8 hours — one working day, then log in again
};

// --- Middleware ("things that run on every request") ---------------

// Parse JSON request bodies, so req.body works for POST/PUT.
app.use(express.json());

// Express rejects malformed JSON before a route handler runs. Keep that
// failure in the API's normal JSON shape instead of its default HTML error
// page, which can include an internal stack trace during local development.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ errors: ['Request body must be valid JSON.'] });
  }
  next(err);
});

// Parse cookies, including SIGNED ones. Passing the secret here is what
// lets us read req.signedCookies later; a cookie whose signature doesn't
// check out simply doesn't appear there at all.
app.use(cookieParser(SESSION_SECRET));

// Serve the front-end files (index.html etc.) from /public.
app.use(express.static(path.join(__dirname, 'public')));

// --- Rate limiting ----------------------------------------------------
/**
 * A rate limiter counts how many times one IP address has hit a route
 * recently, and starts refusing once that goes past a sensible number.
 *
 * It is not really about blocking a person typing too fast — it is about
 * a SCRIPT. Without a limit, a program can hammer the login route with
 * thousands of password guesses a minute, or fill the database with junk
 * registrations, in the time it takes to make a cup of tea. A limit turns
 * "thousands of guesses a minute" into "ten every quarter hour", which
 * makes guessing a password hopeless while a real person never notices.
 *
 * The limits below are applied per route rather than to the whole site,
 * because the sensible number is different for each one.
 */
function makeLimiter(windowMs, limit, keyGenerator) {
  return rateLimit({
    windowMs,
    limit,
    ...(keyGenerator ? { keyGenerator } : {}),
    standardHeaders: true, // report the limit in the modern RateLimit-* headers
    legacyHeaders: false,  // ...and not the old X-RateLimit-* ones
    // Reply in the same { errors: [...] } shape as the rest of the API, so
    // the front-end's existing error handling shows it without changes.
    handler: (req, res) => {
      res.status(429).json({ errors: ['Too many requests, please try again later.'] });
    }
  });
}

// Creating a registration: 20 per hour per IP.
// A school registers once. Even a busy office doing several classes in one
// sitting stays well under 20, so this only ever catches a script.
const createRegistrationLimiter = makeLimiter(60 * 60 * 1000, 20);

// Adding a student: 200 per hour per IP *per class link*.
//
// Counted per (IP, token) rather than per IP alone, because of how schools
// connect: every device on a school's network usually reaches us from ONE
// public IP. A plain per-IP limit meant that once a school's classes had
// signed up 60 children in an hour between them, every further child at
// that school was refused — the exact moment (a class scanning the QR code
// together) this site exists for. Keyed by link as well, each class gets
// its own allowance, and 200 covers the largest class plus corrections.
//
// A script still cannot flood one class: it gets 200 an hour against any
// single link, from any single address.
function readLinkToken(req) {
  if (req.params && req.params.token) return String(req.params.token);
  const bearerMatch = String(req.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  return bearerMatch ? bearerMatch[1].trim() : String(req.query.token || '').trim();
}
const studentSignUpLimiter = makeLimiter(60 * 60 * 1000, 200,
  (req) => `${ipKeyGenerator(req.ip)}|${readLinkToken(req)}`);

// Admin login: 10 attempts per 15 minutes per IP.
// The tightest limit, because this is the one route where an attacker
// gains something by trying again. A forgetful admin gets plenty of
// tries; a script gets 40 guesses an hour, which is useless to it.
const adminLoginLimiter = makeLimiter(15 * 60 * 1000, 10);

// --- Admin authentication -------------------------------------------

/**
 * requireAdmin — a "gatekeeper" placed in front of the admin-only routes.
 *
 * Express middleware runs before the route handler. If the visitor has a
 * valid signed admin cookie we call next() and the real handler runs; if
 * not we stop right here with 401 ("Unauthorised") and the handler never
 * sees the request. Putting the check here rather than inside each route
 * means it is impossible to forget it on one of them.
 */
function requireAdmin(req, res, next) {
  // req.signedCookies only contains cookies whose signature was valid.
  // If the server has no SESSION_SECRET this is always empty → fails closed.
  if (ADMIN_CONFIGURED && req.signedCookies && req.signedCookies[ADMIN_COOKIE_NAME] === 'admin') {
    return next();
  }
  return res.status(401).json({ errors: ['Not authorised.'] });
}

/**
 * POST /api/admin/login
 * Body: { password }. Checks it against the bcrypt hash from .env and,
 * if it matches, sets the signed admin cookie.
 *
 * A wrong password and a server with no password configured take the same
 * deliberately slow bcrypt path and return the same response. That avoids
 * advertising configuration state through either status or obvious timing.
 */
app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
  const password = String(req.body?.password ?? '');

  // bcrypt.compareSync re-hashes the guess with the same salt and compares
  // the results. It is deliberately slow, which is what makes guessing
  // passwords in bulk impractical.
  // Use a real fallback hash when configuration is missing. This keeps the
  // failure path deliberately slow too, so status and response time do not
  // advertise whether the server has an admin password configured.
  const fallbackHash = '$2b$10$C6UzMDM.H6dfI/f/IKcEe.yrLq2V1D5K5M/VfN9N4C8fM.6f7l7hK';
  let passwordMatches = false;
  try {
    passwordMatches = bcrypt.compareSync(password, ADMIN_CONFIGURED ? ADMIN_PASSWORD_HASH : fallbackHash);
  } catch (err) {
    // A malformed configured hash is configuration failure, never access.
    console.error('Admin password hash is invalid.');
  }

  if (!ADMIN_CONFIGURED || !passwordMatches) {
    return res.status(401).json({ errors: ['Incorrect password.'] });
  }

  res.cookie(ADMIN_COOKIE_NAME, 'admin', ADMIN_COOKIE_OPTIONS);
  res.json({ ok: true });
});

/**
 * POST /api/admin/logout
 * Clears the admin cookie. Always succeeds — logging out when you were
 * never logged in is harmless.
 */
app.post('/api/admin/logout', (req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME, ADMIN_COOKIE_OPTIONS);
  res.json({ ok: true });
});

/**
 * GET /api/admin/session
 * Says whether the caller is currently logged in. The admin page asks
 * this on load so that refreshing the page doesn't force a fresh login.
 */
app.get('/api/admin/session', (req, res) => {
  const authenticated = Boolean(
    ADMIN_CONFIGURED && req.signedCookies && req.signedCookies[ADMIN_COOKIE_NAME] === 'admin'
  );
  res.json({ authenticated });
});

// --- Which registration columns are safe to send back ----------------
/**
 * Every column of the registrations table EXCEPT `token`.
 *
 * `SELECT *` is convenient but dangerous: the moment someone adds a
 * sensitive column to the table, every route using `*` starts quietly
 * publishing it, and nobody notices. Listing the columns means a new
 * column is private until somebody deliberately adds it here.
 *
 * `token` is left out because it is a credential. Anyone holding a
 * class's token can read that class's students, so it must never appear
 * in an API reply. The one place it legitimately reaches the outside
 * world is inside the shareable link (and the QR code of that link)
 * returned once, to the teacher, at the moment they register.
 *
 * NOTE: this is a fixed string written by us, never anything a visitor
 * sent — that is why it is safe to drop into the SQL below. Real VALUES
 * must still always go through "?" placeholders. See the note on
 * prepared statements further down.
 */
const REGISTRATION_COLUMNS =
  'id, school, contact, email, students, adults, not_attending, session, date, notes, file_name, status, year_groups';

// --- The shared "Individual / Walk-in" registration --------------------
/**
 * One row in `registrations` is not a school at all: it is the shared
 * container that direct, no-teacher-involved sign-ups attach to. db.js
 * creates it on startup.
 *
 * Its `is_walk_in` database flag is the identity. The school name is only
 * display text and may legitimately be used by an ordinary registration.
 * A helper keeps every server-side check on the durable flag.
 *
 * WHY THE SERVER HAS TO ASK AT ALL: this row's token is deliberately
 * PUBLIC — GET /api/walk-in-registration hands it to anybody, because the
 * student page needs it to attach a walk-in sign-up. Every other token in
 * the table is a secret that acts as a password. So the walk-in token must
 * never be allowed through a door that treats "you hold the token" as
 * "you are the teacher": that would let any visitor read and delete every
 * individual child's name, age and allergies. Public token, public
 * privileges only.
 */
/**
 * True if this registration row is the shared walk-in container.
 * Takes a row (or anything with an `is_walk_in`) and copes with being handed
 * nothing, so callers can ask without checking for null first.
 */
function isWalkInRegistration(reg) {
  return Boolean(reg) && reg.is_walk_in === 1;
}

// --- Validation (FR3) -----------------------------------------------
/**
 * Checks incoming registration data and returns a list of problems.
 * An empty list means the data is valid.
 *
 * IMPORTANT CONCEPT: the front-end also validates (for instant
 * feedback), but the back-end MUST validate too — the server can
 * never trust what a browser sends it. This is standard practice.
 */
function isJsonObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function strictInteger(value) {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value);
  return null;
}

function isRealDate(value) {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

// Upper limits on free-text fields. Two of the routes that take these are
// public, and without a cap one request could store a name the size of a
// novel — which then gets drawn into every admin table and chart label.
// Generous enough that no real school or child's name comes near them.
const MAX_LENGTH = {
  name: 100,
  school: 150,
  email: 254,
  allergies: 500,
  notes: 1000,
  fileName: 255
};

// The year groups anyone can pick, in school order — Year 1 to Year 13,
// then 18+ for adult learners. Used for a student's own year group and for
// the year groups a teacher says their class covers.
const VALID_YEAR_GROUPS = [...Array.from({ length: 13 }, (_, i) => `Year ${i + 1}`), '18+'];

/**
 * A teacher's year groups arrive as an array of strings. Returns them
 * de-duplicated and in school order, or null if anything in it is not a
 * real year group (or it is not an array at all).
 */
function normaliseYearGroups(value) {
  if (!Array.isArray(value)) return null;
  const picked = new Set(value.map(String));
  if ([...picked].some((y) => !VALID_YEAR_GROUPS.includes(y))) return null;
  return VALID_YEAR_GROUPS.filter((y) => picked.has(y));
}

function validateRegistration(body, options = {}) {
  const errors = [];

  if (!isJsonObject(body)) return ['Request body must be a JSON object.'];

  if (!body.school || !String(body.school).trim()) {
    errors.push('School name is required.');
  } else if (String(body.school).trim().length > MAX_LENGTH.school) {
    errors.push(`School name must be ${MAX_LENGTH.school} characters or fewer.`);
  }
  if (!body.contact || !String(body.contact).trim()) {
    errors.push('Contact person is required.');
  } else if (String(body.contact).trim().length > MAX_LENGTH.name) {
    errors.push(`Contact name must be ${MAX_LENGTH.name} characters or fewer.`);
  }

  // Simple email shape check: something@something.something
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email || '').trim());
  if (!emailOk || String(body.email).trim().length > MAX_LENGTH.email) {
    errors.push('A valid contact email is required.');
  }
  if (String(body.notes ?? '').trim().length > MAX_LENGTH.notes) {
    errors.push(`Notes must be ${MAX_LENGTH.notes} characters or fewer.`);
  }
  if (String(body.file_name ?? '').trim().length > MAX_LENGTH.fileName) {
    errors.push(`File name must be ${MAX_LENGTH.fileName} characters or fewer.`);
  }

  const students = strictInteger(body.students);
  if (students === null || students < 1 || students > 500) {
    errors.push('Number of students must be a whole number between 1 and 500.');
  }

  const adults = body.adults === undefined ? 0 : strictInteger(body.adults);
  if (adults === null || adults < 0 || adults > 200) {
    errors.push('Number of adults must be a whole number between 0 and 200.');
  }

  // How many of the booked students are NOT coming. It cannot be negative,
  // and it cannot be more than the class itself — "30 students, 40 of them
  // not attending" is nonsense, and would make the real head count come out
  // below zero everywhere it is worked out.
  const notAttending = body.not_attending === undefined ? 0 : strictInteger(body.not_attending);
  if (notAttending === null || notAttending < 0) {
    errors.push('Number not attending must be a whole number of 0 or more.');
  } else if (students !== null && notAttending > students) {
    // Only worth saying once `students` is itself a sensible number —
    // otherwise a blank student count would produce two confusing errors
    // about the same missing answer.
    errors.push('Number not attending cannot be more than the number of students.');
  }

  // Date must look like YYYY-MM-DD (what <input type="date"> sends).
  //
  // Public teacher registration is restricted to the three advertised days.
  // An admin full edit may use another real date for a correction, make-up
  // visit, or a fourth day added late, so that route omits eventDaysOnly.
  if (!isRealDate(body.date)) {
    errors.push('A valid visit date is required.');
  } else if (options.eventDaysOnly && !EVENT_DAYS.some((day) => day.date === body.date)) {
    errors.push('Please select one of the available event days.');
  }

  // Year groups: required on the public teacher form. An admin edit may
  // leave them out entirely (the admin table does not edit them), in which
  // case the stored value is kept — but anything that IS sent is checked.
  if (body.year_groups === undefined) {
    if (options.requireYearGroups) errors.push('Please choose at least one year group.');
  } else {
    const yearGroups = normaliseYearGroups(body.year_groups);
    if (yearGroups === null) {
      errors.push('Year groups must be chosen from the list.');
    } else if (!yearGroups.length) {
      errors.push('Please choose at least one year group.');
    }
  }

  if (typeof body.session !== 'string' || !body.session.trim()) {
    errors.push('Please select a session.');
  } else if (options.eventDaysOnly && body.session !== 'NZ Tech Week 2027') {
    errors.push('Please select the current event.');
  }

  return errors;
}

/** Pulls just the fields we store out of a request body (ignores anything extra). */
function cleanRegistration(body) {
  return {
    school: String(body.school).trim(),
    contact: String(body.contact).trim(),
    email: String(body.email).trim(),
    students: strictInteger(body.students),
    adults: body.adults === undefined ? 0 : strictInteger(body.adults),
    not_attending: body.not_attending === undefined ? 0 : strictInteger(body.not_attending),
    session: String(body.session).trim(),
    date: String(body.date),
    notes: String(body.notes ?? '').trim(),
    file_name: String(body.file_name ?? '').trim(),
    // null = "not sent", so an admin edit leaves the stored value alone.
    year_groups: body.year_groups === undefined
      ? null
      : normaliseYearGroups(body.year_groups).join(', ')
  };
}

// --- Confirmation emails ----------------------------------------------
/**
 * Where the event is, for the confirmation email's "save the date" box.
 * Same address as the site footer and the map on the home page.
 */
const EVENT_LOCATION = '15 Earl Richardson Avenue, Wiri, Auckland 2104';

/** "Day 1 — Tuesday 18 May 2027" for a stored date, or null if it is not an event day. */
function eventDayLabel(date) {
  const day = EVENT_DAYS.find((d) => d.date === date);
  return day ? day.label : null;
}

/**
 * Confirmation for a newly added student.
 *
 * There is no address to send to yet: the student forms do not ask for an
 * email (they collect as little about children as the event needs), so
 * this passes `null` and email.js just logs that it skipped. It is wired in
 * anyway so that if an email field is ever added, filling in `to` here is
 * the whole job.
 *
 * The date is the class's event day. Individual sign-ups sit under the
 * walk-in container, whose date is not an event day, so theirs comes out
 * as null and the email says "to be confirmed" rather than a wrong date.
 *
 * Not awaited by the routes: the student is saved whatever email does.
 */
function sendStudentConfirmation(registrationDate, student) {
  sendConfirmationEmail(null, {
    recipientName: student.name,
    workshopName: student.preferred_session,
    eventDate: eventDayLabel(registrationDate),
    eventLocation: EVENT_LOCATION,
    registrationType: 'student'
  });
}

// --- API routes ------------------------------------------------------

/**
 * GET /api/registrations
 * Returns every record, newest visit date first.
 * The front-end computes stats/charts/repeat-visitors from this list,
 * which keeps the API surface small for the proof of concept.
 *
 * ADMIN ONLY — this is the whole contact list for every school that has
 * registered, so requireAdmin runs first.
 */
app.get('/api/registrations', requireAdmin, (req, res) => {
  const rows = db
    .prepare(`SELECT ${REGISTRATION_COLUMNS}, is_walk_in FROM registrations ORDER BY date DESC, id DESC`)
    .all();
  res.json(rows);
});

/**
 * GET /api/registrations/count
 * PUBLIC. Just the number of schools registered, for the live counter on
 * the home page.
 *
 * The home page used to get this by fetching the entire list from
 * GET /api/registrations and counting it — which meant every visitor to
 * the front page was handed every school's contact name, email and link
 * token. That route is admin-only now, so the counter asks for the one
 * thing it actually displays: a number.
 *
 * A count on its own identifies nobody, and it was already shown publicly
 * on the home page, so this exposes nothing new — it replaces a route
 * that leaked far more.
 *
 * The shared "Individual / Walk-in" container is excluded, because it is
 * internal plumbing rather than a school that registered.
 */
app.get('/api/registrations/count', (req, res) => {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM registrations WHERE is_walk_in = 0')
    .get();
  res.json({ count: row.n });
});

/**
 * POST /api/registrations
 * Creates a new record (a teacher's class). New records always start as
 * 'Pending'. Also generates a unique token, the shareable /join/:token
 * link built from it, and a QR code image (data URL) for that link — so
 * the teacher can hand it to their students to self-register.
 * Responds with the created record plus { link, qrCode }.
 *
 * NOTE ON THE TWO LINKS: the same token opens two different pages.
 *   /join/<token>      → the STUDENT sign-up page. This is `link` below,
 *                        the one that goes in the QR code and gets shared.
 *   /register/<token>  → the TEACHER's own portal for managing the class.
 * Only the student link is built here, because that is the one the
 * teacher is about to hand out; register.html shows them both.
 */
app.post('/api/registrations', createRegistrationLimiter, async (req, res) => {
  const errors = validateRegistration(req.body, { eventDaysOnly: true, requireYearGroups: true });
  if (errors.length) {
    // 400 = "Bad Request": you sent me data I can't accept.
    return res.status(400).json({ errors });
  }

  const data = cleanRegistration(req.body);
  const token = crypto.randomUUID();

  // "?" placeholders are PREPARED STATEMENTS. The database treats the
  // values purely as data, never as SQL — this is what prevents
  // SQL injection attacks. Never build SQL strings by hand.
  const result = db
    .prepare(`
      INSERT INTO registrations (school, contact, email, students, adults, not_attending, session, date, notes, file_name, year_groups, status, token, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, datetime('now'))
    `)
    .run(data.school, data.contact, data.email, data.students, data.adults,
         data.not_attending, data.session, data.date, data.notes, data.file_name,
         data.year_groups, token);

  const created = db
    .prepare(`SELECT ${REGISTRATION_COLUMNS} FROM registrations WHERE id = ?`)
    .get(result.lastInsertRowid);

  // The link is built from the `token` variable we generated a moment ago,
  // not from the row we just read back — which is why `created` can safely
  // leave the token column out. The teacher gets the link and the QR code;
  // the raw token is never a field of its own in the reply.
  const link = `${req.protocol}://${req.get('host')}/join/${token}`;

  let qrCode = null;
  try {
    qrCode = await QRCode.toDataURL(link);
  } catch (err) {
    console.error('QR code generation failed:', err.message);
  }

  // Confirmation to the teacher's address. Deliberately not awaited: the
  // registration is already saved, and the teacher's success screen should
  // not wait on (or fail because of) an email provider.
  sendConfirmationEmail(data.email, {
    recipientName: data.contact,
    workshopName: null, // teachers don't pick one — each student does
    eventDate: eventDayLabel(data.date),
    eventLocation: EVENT_LOCATION,
    registrationType: 'teacher'
  });

  // 201 = "Created".
  res.status(201).json({ ...created, link, qrCode });
});

/**
 * PUT /api/registrations/:id
 * Updates an existing record. ":id" in the URL is a parameter —
 * e.g. PUT /api/registrations/3 updates record 3.
 *
 * Two uses from the front-end:
 *  a) Full edit from the form (all fields sent, validated).
 *  b) Attendance toggle (only { status } sent).
 *
 * ADMIN ONLY.
 */
app.put('/api/registrations/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  // Only the id is needed here — this read is just "does this record exist?".
  const existing = db.prepare('SELECT id, is_walk_in FROM registrations WHERE id = ?').get(id);

  if (!existing) {
    // 404 = "Not Found".
    return res.status(404).json({ errors: ['Record not found.'] });
  }

  const keys = isJsonObject(req.body) ? Object.keys(req.body) : [];
  if (isWalkInRegistration(existing) && !(keys.length === 1 && keys[0] === 'status')) {
    return res.status(409).json({ errors: ['The walk-in container cannot be edited.'] });
  }

  // Case (b): only the status is being changed (attendance toggle).
  if (keys.length === 1 && keys[0] === 'status') {
    if (!['Pending', 'Arrived'].includes(req.body.status)) {
      return res.status(400).json({ errors: ['Status must be Pending or Arrived.'] });
    }
    db.prepare('UPDATE registrations SET status = ? WHERE id = ?').run(req.body.status, id);
    return res.json(
      db.prepare(`SELECT ${REGISTRATION_COLUMNS} FROM registrations WHERE id = ?`).get(id)
    );
  }

  // Case (a): full edit — validate like a new record.
  const errors = validateRegistration(req.body);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const data = cleanRegistration(req.body);
  db.prepare(`
    UPDATE registrations
    SET school = ?, contact = ?, email = ?, students = ?, adults = ?,
        not_attending = ?, session = ?, date = ?, notes = ?, file_name = ?,
        year_groups = COALESCE(?, year_groups)
    WHERE id = ?
  `).run(data.school, data.contact, data.email, data.students, data.adults,
         data.not_attending, data.session, data.date, data.notes, data.file_name,
         data.year_groups, id);

  res.json(db.prepare(`SELECT ${REGISTRATION_COLUMNS} FROM registrations WHERE id = ?`).get(id));
});

/**
 * DELETE /api/registrations/:id
 * Removes a record permanently.
 *
 * ADMIN ONLY — deleting a class also deletes its students (ON DELETE CASCADE).
 */
app.delete('/api/registrations/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT is_walk_in FROM registrations WHERE id = ?').get(Number(req.params.id));
  if (isWalkInRegistration(existing)) {
    return res.status(409).json({ errors: ['The walk-in container cannot be deleted.'] });
  }
  const result = db
    .prepare('DELETE FROM registrations WHERE id = ?')
    .run(Number(req.params.id));

  if (result.changes === 0) {
    return res.status(404).json({ errors: ['Record not found.'] });
  }
  // 204 = "No Content": success, nothing to send back.
  res.status(204).end();
});

// --- Students (individual sign-ups linked to a registration) ---------
/**
 * A "registration" is a teacher's class (or the shared walk-in row for
 * direct individual sign-ups — see db.js). Each student who signs up
 * under it — via the teacher's link, entered manually by the teacher,
 * or as a direct individual — becomes one row here.
 */

function validateStudent(body) {
  const errors = [];

  if (!isJsonObject(body)) return ['Request body must be a JSON object.'];

  if (!body.name || !String(body.name).trim()) {
    errors.push('Student name is required.');
  } else if (String(body.name).trim().length > MAX_LENGTH.name) {
    errors.push(`Student name must be ${MAX_LENGTH.name} characters or fewer.`);
  }

  if (String(body.allergies ?? '').trim().length > MAX_LENGTH.allergies) {
    errors.push(`Allergies / health conditions must be ${MAX_LENGTH.allergies} characters or fewer.`);
  }

  const ageProvided = body.age !== undefined && body.age !== null && body.age !== '';
  if (ageProvided) {
    const age = strictInteger(body.age);
    if (age === null || age < 1 || age > 25) {
      errors.push('Age must be a whole number between 1 and 25.');
    }
  }

  if (!VALID_YEAR_GROUPS.includes(String(body.year_group))) {
    errors.push('Please select a valid year group.');
  }

  const validSessions = [
    'AI Fundamentals Workshop',
    'Graphic Design Workshop',
    'Build and Battle Robots Workshop',
    'How to Hack a Bank (Ethical Hacking Workshop)',
    "DJ'ing Basics Workshop"
  ];
  if (!validSessions.includes(String(body.preferred_session))) {
    errors.push('Please select a preferred session.');
  }

  return errors;
}

function cleanStudent(body) {
  const ageProvided = body.age !== undefined && body.age !== null && body.age !== '';
  return {
    name: String(body.name).trim(),
    age: ageProvided ? strictInteger(body.age) : null,
    year_group: String(body.year_group).trim(),
    allergies: String(body.allergies ?? '').trim(),
    preferred_session: String(body.preferred_session).trim()
  };
}

// --- Teacher access (no password — the link token IS the credential) --

/**
 * requireTeacherToken — the gatekeeper for the "manage my own class" routes.
 *
 * A teacher never gets an account or a password. What they get is the
 * shareable link handed to them at registration, which contains a random
 * UUID token. Holding that token is the proof: it is long and random
 * enough that nobody can guess another school's, and it grants access to
 * exactly ONE registration — the one it belongs to.
 *
 * The token can arrive two ways:
 *   Authorization: Bearer <token>   — the tidy way, used by fetch() calls
 *   ?token=<token>                  — convenient when following a link
 *
 * On success the whole registration row is hung on req.registration, so
 * the route handlers below can use req.registration.id and never have to
 * trust an id sent by the caller. That is the point: the caller says
 * "here is my token", not "here is the class I want", so they cannot ask
 * for someone else's class.
 */
function requireTeacherToken(req, res, next) {
  const authHeader = String(req.get('authorization') || '');
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = bearerMatch ? bearerMatch[1].trim() : String(req.query.token || '').trim();

  if (!token) {
    return res.status(404).json({ errors: ['Registration link not found.'] });
  }

  // Read the safe columns only. The token was the input to this lookup, so
  // there is no reason to carry a second copy of it around on req.
  const registration = db
    .prepare(`SELECT ${REGISTRATION_COLUMNS}, is_walk_in FROM registrations WHERE token = ?`)
    .get(token);

  if (!registration || isWalkInRegistration(registration)) {
    // Deliberately the same 404 as "no token at all": a caller probing for
    // valid tokens learns nothing from the difference.
    //
    // The walk-in row is refused here for exactly that reason. Its token is
    // published to anyone who asks (GET /api/walk-in-registration), so if it
    // opened these routes, "anyone" would include anyone who wanted to list
    // or delete every individual child's name, age and allergies. It is a
    // public token, so it gets no teacher powers.
    //
    // And it is refused with the SAME reply as an unknown token, on purpose:
    // a caller trying tokens one by one must not be able to tell "that is
    // the walk-in one" apart from "that is not a registration at all".
    return res.status(404).json({ errors: ['Registration link not found.'] });
  }

  req.registration = registration;
  next();
}

/**
 * GET /api/my-registration
 * The teacher's own registration record.
 *
 * The token is deliberately NOT included in the reply. The caller already
 * has it (they just sent it), so echoing it back adds nothing and only
 * creates one more place it can leak — into a log, a screenshot, a
 * browser cache. Never return a secret you weren't asked for.
 */
app.get('/api/my-registration', requireTeacherToken, (req, res) => {
  const r = req.registration;
  res.json({
    id: r.id,
    school: r.school,
    contact: r.contact,
    email: r.email,
    students: r.students,
    adults: r.adults,
    not_attending: r.not_attending,
    session: r.session,
    date: r.date,
    notes: r.notes,
    file_name: r.file_name,
    status: r.status,
    year_groups: r.year_groups
  });
});

/**
 * GET /api/my-registration/qr
 * The teacher's student share link and a QR code image of it, so the
 * teacher portal can show them again long after registration day.
 *
 * Why ask the server for the QR code rather than drawing it in the page?
 * Because the browser would need a whole QR-drawing library downloaded on
 * every visit to redraw something the server already knows how to make.
 * The `qrcode` package is here on the server anyway (POST /api/registrations
 * uses it), so this route is a handful of lines and the page stays a plain
 * <img>. Fewer moving parts, nothing extra to load.
 *
 * The token itself is still not sent as a field — it only ever appears
 * inside the link, exactly as it does at registration time.
 */
app.get('/api/my-registration/qr', requireTeacherToken, async (req, res) => {
  // Read the token back the same way requireTeacherToken did. We cannot use
  // req.registration for this, because that row deliberately leaves the
  // token column out — and the link needs the token in it.
  const authHeader = String(req.get('authorization') || '');
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = bearerMatch ? bearerMatch[1].trim() : String(req.query.token || '').trim();

  const link = `${req.protocol}://${req.get('host')}/join/${token}`;

  let qrCode = null;
  try {
    qrCode = await QRCode.toDataURL(link);
  } catch (err) {
    console.error('QR code generation failed:', err.message);
  }

  res.json({ link, qrCode });
});

/**
 * GET /api/my-registration/students
 * The students signed up under the teacher's own class — and only those,
 * because the query filters by req.registration.id, which came from the
 * token rather than from anything the caller typed.
 */
app.get('/api/my-registration/students', requireTeacherToken, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM students WHERE registration_id = ? ORDER BY created_at DESC, id DESC')
    .all(req.registration.id);
  res.json(rows);
});

/**
 * POST /api/my-registration/students
 * A teacher adding one of their own students by hand.
 */
app.post('/api/my-registration/students', studentSignUpLimiter, requireTeacherToken, (req, res) => {
  const errors = validateStudent(req.body);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const data = cleanStudent(req.body);
  const result = db
    .prepare(`
      INSERT INTO students (registration_id, name, age, year_group, allergies, preferred_session)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(req.registration.id, data.name, data.age, data.year_group,
         data.allergies, data.preferred_session);

  sendStudentConfirmation(req.registration.date, data);

  res.status(201).json(db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid));
});

/**
 * DELETE /api/my-registration/students/:studentId
 * Removes one student from the teacher's own class.
 *
 * THE IMPORTANT LINE is the registration_id check in the WHERE clause.
 * Student ids are small sequential numbers, so a teacher could easily
 * type /api/my-registration/students/7 for a child in a completely
 * different school. Including "AND registration_id = ?" means such a
 * delete simply matches no rows and changes nothing — the token only
 * ever reaches inside its own class.
 */
app.delete('/api/my-registration/students/:studentId', requireTeacherToken, (req, res) => {
  const result = db
    .prepare('DELETE FROM students WHERE id = ? AND registration_id = ?')
    .run(Number(req.params.studentId), req.registration.id);

  if (result.changes === 0) {
    // 404 rather than 403: we don't confirm that someone else's student exists.
    return res.status(404).json({ errors: ['Student not found.'] });
  }
  res.status(204).end();
});

/**
 * GET /api/registrations/token/:token
 * PUBLIC. The student self-registration page, reached through a teacher's
 * shared link, calls this just to show whose class the student is joining.
 *
 * It returns the school name and nothing else — no id, no contact, no
 * email, no notes. A public route should hand back the smallest piece of
 * information that does the job.
 */
app.get('/api/registrations/token/:token', (req, res) => {
  const reg = db
    .prepare('SELECT school, is_walk_in FROM registrations WHERE token = ?')
    .get(req.params.token);

  if (!reg) {
    return res.status(404).json({ errors: ['Registration link not found.'] });
  }

  // isWalkIn tells the student page which greeting to show: an individual
  // signing up on their own should not read "You're joining Individual /
  // Walk-in's visit". It has to be the FLAG and not the school name,
  // because a real teacher is allowed to name their class anything at all,
  // including that exact string — see isWalkInRegistration.
  //
  // Sending it leaks nothing: this route is already public, and the
  // walk-in token is handed to anyone who asks for it by design.
  res.json({ school: reg.school, isWalkIn: isWalkInRegistration(reg) });
});

/**
 * GET /api/walk-in-registration
 * PUBLIC. Returns the TOKEN of the shared "Individual / Walk-in"
 * registration that direct (no teacher link) sign-ups attach to.
 *
 * It used to return the id, and the student page then posted to an
 * id-based route — which meant anyone could sign a student up under any
 * class just by changing the number. Everything is keyed by token now,
 * and this row's token is public by design: it is the shared container
 * for walk-ins and holds no school's private data.
 */
app.get('/api/walk-in-registration', (req, res) => {
  const reg = db
    .prepare('SELECT token FROM registrations WHERE is_walk_in = 1')
    .get();

  if (!reg) {
    return res.status(404).json({ errors: ['Walk-in registration is not set up.'] });
  }
  res.json({ token: reg.token });
});

/**
 * GET /api/admin/students
 * Every student in the system, in one array.
 *
 * ADMIN ONLY — same children's data as the per-registration route below,
 * so the same gatekeeper.
 *
 * WHY THIS EXISTS: the admin dashboard needs the students of every class
 * at once (for the head-count stat, the "most popular session" stat and
 * the pie chart). It used to get them by asking for one class at a time —
 * one HTTP request per registration. That is fine with the five seeded
 * rows and hopeless at the ~1,000 sign-ups the client is planning for:
 * a thousand round trips on a single page load, all of them waiting on
 * the same browser connection limit.
 *
 * One query instead of N. Each row already carries `registration_id`, so
 * the dashboard can group them itself in memory — which is free — rather
 * than making the network do the grouping.
 *
 * The ORDER BY is the same as the per-registration route so the rows
 * arrive in the shape the dashboard has always seen: newest first.
 */
app.get('/api/admin/students', requireAdmin, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM students ORDER BY created_at DESC, id DESC')
    .all();
  res.json(rows);
});

// --- Admin PDF export ---------------------------------------------------
/**
 * The PDF is drawn in a font that has the macrons and ʻokina of Māori,
 * Samoan and Tongan names. PDFKit's built-in Helvetica only covers the old
 * Windows-1252 character set, so "Ana Toluta’u" survives but "Tāne" or
 * "ʻAna" would print as junk — not acceptable for a list of these
 * children. We use a font the machine already has rather than shipping
 * one in the repo: Arial on Windows and macOS, DejaVu or Liberation Sans
 * on Linux. If none is found it falls back to Helvetica and says so once.
 */
const PDF_FONT_CANDIDATES = [
  ['C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/arialbd.ttf'],
  ['/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'],
  ['/Library/Fonts/Arial.ttf', '/Library/Fonts/Arial Bold.ttf'],
  ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'],
  ['/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']
];
const PDF_FONTS = (() => {
  const found = PDF_FONT_CANDIDATES.find(([regular, bold]) => fs.existsSync(regular) && fs.existsSync(bold));
  if (found) return { regular: found[0], bold: found[1] };
  console.warn('PDF export: no Unicode font found, using Helvetica — macrons and ʻokina in names will not print correctly.');
  return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
})();

const NZ_TIME_ZONE = 'Pacific/Auckland';

/** Today's date in New Zealand as YYYY-MM-DD (en-CA formats dates that way). */
function nzDateStamp(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: NZ_TIME_ZONE }).format(date);
}

/**
 * SQLite's datetime('now') is UTC text, "YYYY-MM-DD HH:MM:SS". Shown in NZ
 * time, because that is what the people reading the PDF live in.
 */
function formatNzDateTime(sqliteUtc) {
  if (!sqliteUtc) return '—';
  const date = new Date(`${sqliteUtc.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: NZ_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  }).format(date);
}

/**
 * Draws one table, starting a new page (and repeating the header row)
 * whenever the next row would not fit. Cells wrap rather than truncate,
 * so a long school or workshop name is never cut off mid-word.
 */
function drawPdfTable(doc, columns, rows) {
  const left = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const widths = columns.map((c) => c.width * usableWidth);
  const pad = 4;
  const bottom = () => doc.page.height - doc.page.margins.bottom;

  function rowHeight(cells, font) {
    doc.font(font).fontSize(9);
    return Math.max(...cells.map((text, i) =>
      doc.heightOfString(text, { width: widths[i] - pad * 2 }))) + pad * 2;
  }

  function drawRow(cells, { font, fill }) {
    const height = rowHeight(cells, font);
    let y = doc.y;
    if (y + height > bottom()) {
      doc.addPage();
      y = doc.y;
      if (!fill) drawRow(columns.map((c) => c.label), { font: PDF_FONTS.bold, fill: '#e6f2ed' });
      y = doc.y;
    }
    if (fill) doc.rect(left, y, usableWidth, height).fill(fill);
    doc.moveTo(left, y + height).lineTo(left + usableWidth, y + height)
      .lineWidth(0.5).strokeColor('#cccccc').stroke();
    let x = left;
    doc.fillColor('#111111').font(font).fontSize(9);
    cells.forEach((text, i) => {
      doc.text(text, x + pad, y + pad, { width: widths[i] - pad * 2 });
      x += widths[i];
    });
    doc.x = left;
    doc.y = y + height;
  }

  drawRow(columns.map((c) => c.label), { font: PDF_FONTS.bold, fill: '#e6f2ed' });
  if (!rows.length) {
    drawRow(['None yet.', ...columns.slice(1).map(() => '')], { font: PDF_FONTS.regular });
    return;
  }
  rows.forEach((cells) => drawRow(cells.map((c) => String(c ?? '—')), { font: PDF_FONTS.regular }));
}

/**
 * GET /api/admin/export/pdf
 * Every student and every teacher registration as one printable PDF.
 *
 * ADMIN ONLY — this is the most sensitive thing the site can produce: a
 * single file of children's names and schools. It deliberately leaves out
 * ages and allergies, which nobody asked to print, and is sent with
 * no-store so a shared computer's browser does not keep a cached copy.
 *
 * "Teacher registrations" are the rows in `registrations`, minus the
 * walk-in container (internal plumbing, not a teacher). Students who
 * signed up on their own are listed with "Individual" as their school.
 *
 * Explicit columns throughout, as everywhere else in this file.
 */
app.get('/api/admin/export/pdf', requireAdmin, async (req, res) => {
  const students = db.prepare(`
    SELECT s.name, s.year_group, s.preferred_session, s.created_at,
           r.school, r.is_walk_in
    FROM students s
    JOIN registrations r ON r.id = s.registration_id
    ORDER BY r.is_walk_in, r.school COLLATE NOCASE, s.name COLLATE NOCASE
  `).all();

  const teachers = db.prepare(`
    SELECT contact, school, email, created_at
    FROM registrations
    WHERE is_walk_in = 0
    ORDER BY school COLLATE NOCASE, contact COLLATE NOCASE
  `).all();

  const exportedAt = new Date();
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 40, bottom: 50, left: 40, right: 40 },
    bufferPages: true, // so page numbers ("Page 2 of 5") can be added at the end
    info: { Title: 'NZ Tech Week 2027 — SACTH Registrations', Author: 'Pou Hono' }
  });

  // Collect the whole file in memory before sending, so a failure halfway
  // through becomes a clean 500 rather than a truncated download.
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    doc.on('end', resolve);
    doc.on('error', reject);
  });

  try {
    // Header
    doc.font(PDF_FONTS.bold).fontSize(18).fillColor('#111111')
      .text('NZ Tech Week 2027 — SACTH Registrations');
    doc.font(PDF_FONTS.regular).fontSize(10).fillColor('#555555')
      .text(`Exported ${formatNzDateTime(exportedAt.toISOString().slice(0, 19).replace('T', ' '))} (NZ time)`);
    doc.moveDown(1.2);

    // Students
    doc.font(PDF_FONTS.bold).fontSize(13).fillColor('#111111')
      .text(`Student Registrations (${students.length})`);
    doc.moveDown(0.4);
    drawPdfTable(doc, [
      { label: 'Name', width: 0.22 },
      { label: 'School', width: 0.22 },
      { label: 'Year Level', width: 0.1 },
      { label: 'Workshop Selected', width: 0.28 },
      { label: 'Registered At', width: 0.18 }
    ], students.map((s) => [
      s.name,
      s.is_walk_in === 1 ? 'Individual' : s.school,
      s.year_group,
      s.preferred_session,
      formatNzDateTime(s.created_at)
    ]));

    // Teachers
    doc.moveDown(1.5);
    if (doc.y > doc.page.height - doc.page.margins.bottom - 80) doc.addPage();
    doc.font(PDF_FONTS.bold).fontSize(13).fillColor('#111111')
      .text(`Teacher Registrations (${teachers.length})`, doc.page.margins.left);
    doc.moveDown(0.4);
    drawPdfTable(doc, [
      { label: 'Name', width: 0.24 },
      { label: 'School', width: 0.28 },
      { label: 'Email', width: 0.3 },
      { label: 'Registered At', width: 0.18 }
    ], teachers.map((t) => [t.contact, t.school, t.email, formatNzDateTime(t.created_at)]));

    // Footer on every page: totals and "Page X of Y". The bottom margin is
    // lifted while writing it, or PDFKit would treat text in the margin as
    // overflow and start a new page.
    const range = doc.bufferedPageRange();
    const totals = `${students.length} student${students.length === 1 ? '' : 's'} · `
      + `${teachers.length} teacher registration${teachers.length === 1 ? '' : 's'}`;
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const savedBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const y = doc.page.height - 30;
      const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.font(PDF_FONTS.regular).fontSize(8).fillColor('#777777');
      doc.text(totals, doc.page.margins.left, y, { width, align: 'left', lineBreak: false });
      doc.text(`Page ${i - range.start + 1} of ${range.count}`, doc.page.margins.left, y,
        { width, align: 'right', lineBreak: false });
      doc.page.margins.bottom = savedBottom;
    }

    doc.end();
    await finished;
  } catch (err) {
    console.error('PDF export failed:', err);
    return res.status(500).json({ errors: ['Could not create the PDF. Please try again.'] });
  }

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="registrations-${nzDateStamp(exportedAt)}.pdf"`,
    'Cache-Control': 'no-store'
  });
  res.send(Buffer.concat(chunks));
});

/**
 * GET /api/registrations/:id/students
 * Lists every student linked to one registration.
 *
 * ADMIN ONLY — these rows are children's names, ages and allergies, the
 * most sensitive data in the system. Teachers read their OWN class through
 * GET /api/my-registration/students instead, which is keyed by their token.
 */
app.get('/api/registrations/:id/students', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const registration = db.prepare('SELECT id FROM registrations WHERE id = ?').get(id);
  if (!registration) {
    return res.status(404).json({ errors: ['Registration not found.'] });
  }

  const rows = db
    .prepare('SELECT * FROM students WHERE registration_id = ? ORDER BY created_at DESC, id DESC')
    .all(id);
  res.json(rows);
});

/**
 * POST /api/registrations/token/:token/students
 * PUBLIC (but token-gated). Adds one student under a registration. Used by:
 *   a) the student self-registration page, reached via a teacher's link
 *      (token = that teacher's registration)
 *   b) a direct individual sign-up (token = the shared walk-in registration)
 *
 * This REPLACES the old POST /api/registrations/:id/students. That route
 * took a plain sequential id, so anyone could count 1, 2, 3… and post
 * children's names and allergies into any school's class, or probe which
 * ids existed. A token is a random UUID: you cannot guess one, and the
 * only one you hold is your own.
 */
app.post('/api/registrations/token/:token/students', studentSignUpLimiter, (req, res) => {
  const registration = db
    .prepare('SELECT id, date FROM registrations WHERE token = ?')
    .get(req.params.token);

  if (!registration) {
    return res.status(404).json({ errors: ['Registration link not found.'] });
  }

  const errors = validateStudent(req.body);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const data = cleanStudent(req.body);
  db
    .prepare(`
      INSERT INTO students (registration_id, name, age, year_group, allergies, preferred_session)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(registration.id, data.name, data.age, data.year_group,
         data.allergies, data.preferred_session);

  sendStudentConfirmation(registration.date, data);

  // Reply with only what the sign-up page shows back to the student. This
  // route is public, so it does not hand out the row's internal ids.
  res.status(201).json({ name: data.name, preferred_session: data.preferred_session });
});

// --- Token link pages ---------------------------------------------------
/**
 * One token, two doors. Which page you land on depends on the path, and
 * that split is the whole point:
 *
 *   /join/:token      the STUDENT self-registration page. This is the
 *                     address in the QR code and in the link the teacher
 *                     hands out — students only ever need to add
 *                     themselves, so it is all they are shown.
 *
 *   /register/:token  the TEACHER's own portal for that class: who has
 *                     signed up so far, the share link and QR code again,
 *                     and a form to type a student in by hand.
 *
 * Both are PUBLIC pages with no login, because holding the token IS the
 * credential. That is not an oversight — see requireTeacherToken above.
 * Nothing sensitive lives in the HTML itself either way: the pages are
 * empty shells that ask the API for data, and the API checks the token.
 *
 * A token that matches no registration bounces back to the home page
 * rather than showing a broken page — usually a mistyped or old link.
 */

// Both routes send the file with { root: PUBLIC_DIR } rather than one long
// absolute path. It reads the same, but it is the safer form: sendFile
// refuses to serve anything with a "dotfile" segment in it, and a project
// checked out under a folder whose name begins with a dot (a git worktree,
// for instance) would make every absolute path look like one and 404.
// Naming the root separately keeps that check on the filename only.
const PUBLIC_DIR = path.join(__dirname, 'public');

app.get('/join/:token', (req, res) => {
  const reg = db.prepare('SELECT id FROM registrations WHERE token = ?').get(req.params.token);
  if (!reg) {
    return res.redirect('/');
  }
  res.sendFile('student.html', { root: PUBLIC_DIR });
});

app.get('/register/:token', (req, res) => {
  const reg = db.prepare('SELECT is_walk_in FROM registrations WHERE token = ?').get(req.params.token);
  if (!reg) {
    return res.redirect('/');
  }
  if (isWalkInRegistration(reg)) {
    // There is no teacher behind the walk-in container, so there is no
    // teacher portal for it — and its token is public, so serving one here
    // would hand every visitor the tools for managing individual sign-ups.
    //
    // Note this is a 404, NOT the redirect above. The redirect is for a
    // mistyped or expired link, which is a visitor's honest mistake and is
    // best answered by quietly putting them back on the home page. A link to
    // /register/<the public walk-in token> is different: nothing in this site
    // ever produces one, so if it is being requested, either somebody built
    // it by hand or we have a bug that generated it. Bouncing that to the
    // home page would hide it. A 404 says plainly that this page does not
    // exist.
    //
    // Plain text rather than a designed error page: the site has no 404
    // page of its own, and inventing one is a bigger change than this fix
    // needs. The status code is the part that matters.
    return res.status(404).type('text').send('Not found.');
  }
  res.sendFile('teacher.html', { root: PUBLIC_DIR });
});

// --- Start ------------------------------------------------------------

app.listen(PORT, (err) => {
  // Express 5 hands a failed listen (most often: the port is already in
  // use) to this callback. Without this check it printed "running" and
  // then exited, which is very confusing when another copy is still up.
  if (err) {
    console.error('');
    console.error(`  Could not start on port ${PORT}: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
      console.error('  Another program (often another copy of this server) is using that port.');
      console.error('  Stop it, or set a different PORT in .env.');
    }
    console.error('');
    process.exit(1);
  }
  console.log('');
  console.log('  Pou Hono is running.');
  console.log(`  Open  http://localhost:${PORT}  in your browser.`);
  console.log(`  Admin dashboard: ${ADMIN_CONFIGURED ? 'configured.' : 'NOT configured (see the warning above).'}`);
  console.log('  Press Ctrl + C to stop the server.');
  console.log('');
});
