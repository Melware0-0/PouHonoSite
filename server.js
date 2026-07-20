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
 * Creates a new record. New records always start as 'Pending'.
 * Responds with the created record (including its new id).
 */
app.post('/api/registrations', (req, res) => {
  const errors = validateRegistration(req.body);
  if (errors.length) {
    // 400 = "Bad Request": you sent me data I can't accept.
    return res.status(400).json({ errors });
  }

  const data = cleanRegistration(req.body);

  // "?" placeholders are PREPARED STATEMENTS. The database treats the
  // values purely as data, never as SQL — this is what prevents
  // SQL injection attacks. Never build SQL strings by hand.
  const result = db
    .prepare(`
      INSERT INTO registrations (school, contact, email, students, adults, session, date, notes, file_name, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    `)
    .run(data.school, data.contact, data.email, data.students, data.adults,
         data.session, data.date, data.notes, data.file_name);

  const created = db
    .prepare('SELECT * FROM registrations WHERE id = ?')
    .get(result.lastInsertRowid);

  // 201 = "Created".
  res.status(201).json(created);
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

// --- Start ------------------------------------------------------------

app.listen(PORT, () => {
  console.log('');
  console.log('  Pou Hono is running.');
  console.log(`  Open  http://localhost:${PORT}  in your browser.`);
  console.log('  Press Ctrl + C to stop the server.');
  console.log('');
});
