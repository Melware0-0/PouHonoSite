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
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');           // password hashing (pure JS, no build step)
const cookieParser = require('cookie-parser'); // reads/writes the admin session cookie
const rateLimit = require('express-rate-limit'); // caps how often one IP can hit a route
const db = require('./db'); // our database module (creates the table on first run)
const EVENT_DAYS = require('./public/event-days.js');

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
function makeLimiter(windowMs, limit) {
  return rateLimit({
    windowMs,
    limit,
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

// Adding a student: 60 per hour per IP.
// Deliberately HIGHER than the registration limit, because one teacher
// typing a whole class in by hand is a completely normal thing to do —
// 30 children, plus corrections and re-entries, would blow through a
// smaller limit and lock out the very person we built this for.
const studentSignUpLimiter = makeLimiter(60 * 60 * 1000, 60);

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
  'id, school, contact, email, students, adults, not_attending, session, date, notes, file_name, status';

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

function validateRegistration(body, options = {}) {
  const errors = [];

  if (!isJsonObject(body)) return ['Request body must be a JSON object.'];

  if (!body.school || !String(body.school).trim()) {
    errors.push('School name is required.');
  }
  if (!body.contact || !String(body.contact).trim()) {
    errors.push('Contact person is required.');
  }

  // Simple email shape check: something@something.something
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email || '').trim());
  if (!emailOk) {
    errors.push('A valid contact email is required.');
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
    file_name: String(body.file_name ?? '').trim()
  };
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
    .prepare(`SELECT ${REGISTRATION_COLUMNS} FROM registrations ORDER BY date DESC, id DESC`)
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
    .prepare("SELECT COUNT(*) AS n FROM registrations WHERE school != 'Individual / Walk-in'")
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
  const errors = validateRegistration(req.body, { eventDaysOnly: true });
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
      INSERT INTO registrations (school, contact, email, students, adults, not_attending, session, date, notes, file_name, status, token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
    `)
    .run(data.school, data.contact, data.email, data.students, data.adults,
         data.not_attending, data.session, data.date, data.notes, data.file_name, token);

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
  const existing = db.prepare('SELECT id FROM registrations WHERE id = ?').get(id);

  if (!existing) {
    // 404 = "Not Found".
    return res.status(404).json({ errors: ['Record not found.'] });
  }

  // Case (b): only the status is being changed (attendance toggle).
  const keys = isJsonObject(req.body) ? Object.keys(req.body) : [];
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
        not_attending = ?, session = ?, date = ?, notes = ?, file_name = ?
    WHERE id = ?
  `).run(data.school, data.contact, data.email, data.students, data.adults,
         data.not_attending, data.session, data.date, data.notes, data.file_name, id);

  res.json(db.prepare(`SELECT ${REGISTRATION_COLUMNS} FROM registrations WHERE id = ?`).get(id));
});

/**
 * DELETE /api/registrations/:id
 * Removes a record permanently.
 *
 * ADMIN ONLY — deleting a class also deletes its students (ON DELETE CASCADE).
 */
app.delete('/api/registrations/:id', requireAdmin, (req, res) => {
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
  }

  const ageProvided = body.age !== undefined && body.age !== null && body.age !== '';
  if (ageProvided) {
    const age = strictInteger(body.age);
    if (age === null || age < 1 || age > 25) {
      errors.push('Age must be a whole number between 1 and 25.');
    }
  }

  const validYearGroups = [...Array.from({ length: 13 }, (_, i) => `Year ${i + 1}`), '18+'];
  if (!validYearGroups.includes(String(body.year_group))) {
    errors.push('Please select a valid year group.');
  }

  const validSessions = ['Robotics', 'Gaming', 'Programming', 'Computer Building', 'Social Media'];
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
    .prepare(`SELECT ${REGISTRATION_COLUMNS} FROM registrations WHERE token = ?`)
    .get(token);

  if (!registration) {
    // Deliberately the same 404 as "no token at all": a caller probing for
    // valid tokens learns nothing from the difference.
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
    status: r.status
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
  const reg = db.prepare('SELECT school FROM registrations WHERE token = ?').get(req.params.token);
  if (!reg) {
    return res.status(404).json({ errors: ['Registration link not found.'] });
  }
  res.json({ school: reg.school });
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
    .prepare("SELECT token FROM registrations WHERE school = 'Individual / Walk-in'")
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
    .prepare('SELECT id FROM registrations WHERE token = ?')
    .get(req.params.token);

  if (!registration) {
    return res.status(404).json({ errors: ['Registration link not found.'] });
  }

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
    .run(registration.id, data.name, data.age, data.year_group,
         data.allergies, data.preferred_session);

  const created = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
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
  const reg = db.prepare('SELECT id FROM registrations WHERE token = ?').get(req.params.token);
  if (!reg) {
    return res.redirect('/');
  }
  res.sendFile('teacher.html', { root: PUBLIC_DIR });
});

// --- Start ------------------------------------------------------------

app.listen(PORT, () => {
  console.log('');
  console.log('  Pou Hono is running.');
  console.log(`  Open  http://localhost:${PORT}  in your browser.`);
  console.log(`  Admin dashboard: ${ADMIN_CONFIGURED ? 'configured.' : 'NOT configured (see the warning above).'}`);
  console.log('  Press Ctrl + C to stop the server.');
  console.log('');
});
