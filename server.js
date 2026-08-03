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
 *       GET    /api/registrations       → list all records
 *       POST   /api/registrations       → create a new record
 *       PUT    /api/registrations/:id   → update an existing record
 *       DELETE /api/registrations/:id   → delete a record
 *
 * "REST API" just means: the front-end and back-end talk by
 * sending JSON over HTTP, using the URL to say WHICH record and
 * the method (GET/POST/PUT/DELETE) to say WHAT to do with it.
 *
 * To run:   node server.js
 * To stop:  Ctrl + C
 */

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const db = require('./db'); // our database module (creates the table on first run)

const app = express();
const PORT = 3000;

// --- Middleware ("things that run on every request") ---------------

// Parse JSON request bodies, so req.body works for POST/PUT.
app.use(express.json());

// Serve the front-end files (index.html etc.) from /public.
app.use(express.static(path.join(__dirname, 'public')));

// --- Validation (FR3) -----------------------------------------------
/**
 * Checks incoming registration data and returns a list of problems.
 * An empty list means the data is valid.
 *
 * IMPORTANT CONCEPT: the front-end also validates (for instant
 * feedback), but the back-end MUST validate too — the server can
 * never trust what a browser sends it. This is standard practice.
 */
function validateRegistration(body) {
  const errors = [];

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

  const students = Number(body.students);
  if (!Number.isInteger(students) || students < 1 || students > 500) {
    errors.push('Number of students must be a whole number between 1 and 500.');
  }

  const adults = Number(body.adults ?? 0);
  if (!Number.isInteger(adults) || adults < 0 || adults > 200) {
    errors.push('Number of adults must be a whole number between 0 and 200.');
  }

  // Date must look like YYYY-MM-DD (what <input type="date"> sends).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date || ''))) {
    errors.push('Visit date is required.');
  }

  if (!body.session || !String(body.session).trim()) {
    errors.push('Please select a session.');
  }

  return errors;
}

/** Pulls just the fields we store out of a request body (ignores anything extra). */
function cleanRegistration(body) {
  return {
    school: String(body.school).trim(),
    contact: String(body.contact).trim(),
    email: String(body.email).trim(),
    students: Number(body.students),
    adults: Number(body.adults ?? 0),
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
 */
app.get('/api/registrations', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM registrations ORDER BY date DESC, id DESC')
    .all();
  res.json(rows);
});

/**
 * POST /api/registrations
 * Creates a new record (a teacher's class). New records always start as
 * 'Pending'. Also generates a unique token, the shareable /register/:token
 * link built from it, and a QR code image (data URL) for that link — so
 * the teacher can hand it to their students to self-register.
 * Responds with the created record plus { link, qrCode }.
 */
app.post('/api/registrations', async (req, res) => {
  const errors = validateRegistration(req.body);
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
      INSERT INTO registrations (school, contact, email, students, adults, session, date, notes, file_name, status, token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
    `)
    .run(data.school, data.contact, data.email, data.students, data.adults,
         data.session, data.date, data.notes, data.file_name, token);

  const created = db
    .prepare('SELECT * FROM registrations WHERE id = ?')
    .get(result.lastInsertRowid);

  const link = `${req.protocol}://${req.get('host')}/register/${token}`;

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
 */
app.put('/api/registrations/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM registrations WHERE id = ?').get(id);

  if (!existing) {
    // 404 = "Not Found".
    return res.status(404).json({ errors: ['Record not found.'] });
  }

  // Case (b): only the status is being changed (attendance toggle).
  const keys = Object.keys(req.body);
  if (keys.length === 1 && keys[0] === 'status') {
    if (!['Pending', 'Arrived'].includes(req.body.status)) {
      return res.status(400).json({ errors: ['Status must be Pending or Arrived.'] });
    }
    db.prepare('UPDATE registrations SET status = ? WHERE id = ?').run(req.body.status, id);
    return res.json(db.prepare('SELECT * FROM registrations WHERE id = ?').get(id));
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
        session = ?, date = ?, notes = ?, file_name = ?
    WHERE id = ?
  `).run(data.school, data.contact, data.email, data.students, data.adults,
         data.session, data.date, data.notes, data.file_name, id);

  res.json(db.prepare('SELECT * FROM registrations WHERE id = ?').get(id));
});

/**
 * DELETE /api/registrations/:id
 * Removes a record permanently.
 */
app.delete('/api/registrations/:id', (req, res) => {
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

  if (!body.name || !String(body.name).trim()) {
    errors.push('Student name is required.');
  }

  const ageProvided = body.age !== undefined && body.age !== null && body.age !== '';
  if (ageProvided) {
    const age = Number(body.age);
    if (!Number.isInteger(age) || age < 1 || age > 25) {
      errors.push('Age must be a whole number between 1 and 25.');
    }
  }

  const validYearGroups = [...Array.from({ length: 13 }, (_, i) => `Year ${i + 1}`), '18+'];
  if (!validYearGroups.includes(String(body.year_group))) {
    errors.push('Please select a valid year group.');
  }

  if (!body.preferred_session || !String(body.preferred_session).trim()) {
    errors.push('Please select a preferred session.');
  }

  return errors;
}

function cleanStudent(body) {
  const ageProvided = body.age !== undefined && body.age !== null && body.age !== '';
  return {
    name: String(body.name).trim(),
    age: ageProvided ? Number(body.age) : null,
    year_group: String(body.year_group).trim(),
    allergies: String(body.allergies ?? '').trim(),
    preferred_session: String(body.preferred_session).trim()
  };
}

/**
 * GET /api/registrations/token/:token
 * Public lookup so the student self-registration page (reached via a
 * teacher's shared link) can find which registration to attach to,
 * without exposing the full registration record (email, notes, etc).
 */
app.get('/api/registrations/token/:token', (req, res) => {
  const reg = db.prepare('SELECT id, school FROM registrations WHERE token = ?').get(req.params.token);
  if (!reg) {
    return res.status(404).json({ errors: ['Registration link not found.'] });
  }
  res.json(reg);
});

/**
 * GET /api/walk-in-registration
 * Returns the id of the shared "Individual / Walk-in" registration that
 * direct (no teacher link) individual sign-ups attach to.
 */
app.get('/api/walk-in-registration', (req, res) => {
  const reg = db.prepare("SELECT id FROM registrations WHERE school = 'Individual / Walk-in'").get();
  res.json(reg);
});

/**
 * GET /api/registrations/:id/students
 * Lists every student linked to one registration.
 */
app.get('/api/registrations/:id/students', (req, res) => {
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
 * POST /api/registrations/:id/students
 * Adds one student under a registration. Used by:
 *   a) the student self-registration page, reached via a teacher's link
 *      (id = that teacher's registration)
 *   b) a teacher adding students manually, one at a time
 *   c) a direct individual sign-up (id = the shared walk-in registration)
 */
app.post('/api/registrations/:id/students', (req, res) => {
  const id = Number(req.params.id);
  const registration = db.prepare('SELECT id FROM registrations WHERE id = ?').get(id);
  if (!registration) {
    return res.status(404).json({ errors: ['Registration not found.'] });
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
    .run(id, data.name, data.age, data.year_group, data.allergies, data.preferred_session);

  const created = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// --- Shared link page ---------------------------------------------------
/**
 * GET /register/:token
 * A teacher's QR code / shared link points here. If the token is valid,
 * serves the student self-registration page (which reads the token back
 * out of the URL to know which registration to attach new students to).
 * Unknown tokens just bounce back to the home page.
 */
app.get('/register/:token', (req, res) => {
  const reg = db.prepare('SELECT id FROM registrations WHERE token = ?').get(req.params.token);
  if (!reg) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

// --- Start ------------------------------------------------------------

app.listen(PORT, () => {
  console.log('');
  console.log('  Pou Hono is running.');
  console.log(`  Open  http://localhost:${PORT}  in your browser.`);
  console.log('  Press Ctrl + C to stop the server.');
  console.log('');
});
