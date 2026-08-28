/**
 * db.js — Database setup (FR4: secure local data storage)
 * ---------------------------------------------------------
 * This file creates and exports the SQLite database connection.
 *
 * Why SQLite?
 *  - The whole database is ONE file on disk (pou-hono.db).
 *    No database server to install, nothing leaves the machine —
 *    which matches the project constraint of "local storage only,
 *    no external cloud services".
 *  - "better-sqlite3" is synchronous (no callbacks/promises needed),
 *    which keeps the code simple and hard to get wrong.
 *
 * The database file is created automatically the first time the
 * server runs. Delete pou-hono.db to reset everything.
 */

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// Open (or create) the database file next to this script.
const db = new Database(path.join(__dirname, 'pou-hono.db'));

// WAL mode = safer writes if the app crashes mid-save. One line, free win.
db.pragma('journal_mode = WAL');

// Enforce the students.registration_id foreign key (SQLite doesn't by default).
db.pragma('foreign_keys = ON');

/**
 * Create the registrations table if it doesn't exist yet.
 *
 * Column notes:
 *  - id:        auto-incrementing unique number (the "primary key")
 *  - students:  stored as INTEGER so we can do maths on it (SUM, AVG)
 *  - date:      stored as TEXT in 'YYYY-MM-DD' format. This format
 *               sorts correctly as plain text, so date-range queries
 *               work with simple >= and <= comparisons.
 *  - status:    either 'Pending' or 'Arrived' (enforced by CHECK)
 *  - file_name: name of an uploaded paper form, if any (FR2).
 *               For this proof of concept we store just the filename;
 *               storing the actual file is a documented future step.
 *  - token:     unique id (crypto.randomUUID()) generated per registration,
 *               used to build the shareable /join/:token link + QR code
 *               that students use to self-register under this class. The
 *               same token also opens the teacher's own /register/:token
 *               portal for managing the class.
 *  - not_attending:
 *               of the `students` booked for, how many will NOT be coming
 *               after all. 0 means "all of them are". Also added by the
 *               ALTER TABLE below, for databases created before it existed.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS registrations (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    school    TEXT    NOT NULL,
    contact   TEXT    NOT NULL,
    email     TEXT    NOT NULL,
    students  INTEGER NOT NULL,
    adults    INTEGER NOT NULL DEFAULT 0,
    not_attending INTEGER NOT NULL DEFAULT 0,
    session   TEXT    NOT NULL,
    date      TEXT    NOT NULL,
    notes     TEXT    DEFAULT '',
    file_name TEXT    DEFAULT '',
    status    TEXT    NOT NULL DEFAULT 'Pending'
              CHECK (status IN ('Pending', 'Arrived')),
    token     TEXT    UNIQUE
  )
`);

/**
 * Adding a column to a table that already exists.
 *
 * CREATE TABLE IF NOT EXISTS above only runs on a brand-new database. If
 * pou-hono.db already exists from an earlier version of the app, that
 * statement does nothing at all — so a column added to it later would
 * never appear on anybody's existing database. The fix is an ALTER TABLE.
 *
 * ALTER TABLE ADD COLUMN throws if the column is already there, and this
 * file runs on EVERY startup, so it has to be "idempotent": safe to run
 * over and over, doing the work only the first time. PRAGMA table_info
 * lists the columns a table actually has right now, so we look for the
 * column and only add it when it is genuinely missing.
 *
 * The payoff is that an existing database upgrades itself in place —
 * nobody has to delete pou-hono.db and lose real registrations. On a
 * brand-new database the column is already in the CREATE TABLE above, so
 * this quietly does nothing, which is exactly what we want.
 *
 *  - not_attending: of the `students` a teacher booked for, how many will
 *    NOT be coming after all. Defaults to 0, which is both the common case
 *    and the right answer for every row that existed before this column
 *    did. The actual head count is students - not_attending.
 */
function addColumnIfMissing(table, column, definition) {
  const columns = db.pragma(`table_info(${table})`);
  const exists = columns.some((c) => c.name === column);

  if (!exists) {
    // The table and column names here are written by us, never by a
    // visitor — which is why they can be part of the SQL string. Values
    // from outside must still always go through "?" placeholders.
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Database upgraded: added ${table}.${column}.`);
  }
}

addColumnIfMissing('registrations', 'not_attending', 'INTEGER NOT NULL DEFAULT 0');

/**
 * Individual student sign-ups, always linked to a registration:
 *  - via a teacher's shared link  → registration_id = that teacher's row
 *  - direct, no teacher involved  → registration_id = the shared
 *    "Individual / Walk-in" registration created below, so every
 *    student row always has somewhere to attach to.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id   INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    name              TEXT    NOT NULL,
    age               INTEGER,
    year_group        TEXT    NOT NULL,
    allergies         TEXT    DEFAULT '',
    preferred_session TEXT    NOT NULL,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

/**
 * Seed data: if the table is completely empty (first ever run),
 * insert a few example records so the app demos nicely.
 * Real data added afterwards is never touched.
 */
const rowCount = db.prepare('SELECT COUNT(*) AS n FROM registrations').get().n;

if (rowCount === 0) {
  const insert = db.prepare(`
    INSERT INTO registrations (school, contact, email, students, adults, session, date, notes, status, token)
    VALUES (@school, @contact, @email, @students, @adults, @session, @date, @notes, @status, @token)
  `);

  const seedRows = [
    { school: 'Papatoetoe Intermediate', contact: 'S. Tuilagi', email: 'office@papatoetoeint.school.nz', students: 32, adults: 3, session: 'Animation — Mon 18 May 10:00am', date: '2026-05-18', notes: '', status: 'Arrived' },
    { school: 'Manurewa Primary', contact: 'J. Fale', email: 'admin@manurewaprimary.school.nz', students: 25, adults: 2, session: 'Music making — Tue 19 May 1:00pm', date: '2026-05-19', notes: 'Two students need wheelchair access', status: 'Arrived' },
    { school: 'Otara Youth Group', contact: 'M. Ropati', email: 'contact@otarayouth.org.nz', students: 18, adults: 4, session: 'Coding — Wed 20 May 9:00am', date: '2026-05-20', notes: '', status: 'Pending' },
    { school: 'Mangere College', contact: 'A. Havili', email: 'reception@mangere.school.nz', students: 40, adults: 3, session: 'Digital design — Thu 21 May 2:00pm', date: '2026-05-21', notes: 'Te reo Māori support requested', status: 'Pending' },
    { school: 'Manurewa Primary', contact: 'J. Fale', email: 'admin@manurewaprimary.school.nz', students: 22, adults: 2, session: 'Coding — Wed 20 May 9:00am', date: '2026-05-20', notes: 'Repeat visit', status: 'Arrived' }
  ].map((row) => ({ ...row, token: crypto.randomUUID() }));

  // A transaction = "do all of these inserts, or none of them".
  const seedAll = db.transaction((rows) => rows.forEach((r) => insert.run(r)));
  seedAll(seedRows);

  console.log('Database created and seeded with example data.');
}

/**
 * Shared container registration for individual sign-ups that arrive
 * without a teacher's link (see students table comment above). Created
 * once and reused — checked on every startup so it self-heals on an
 * existing database that predates this feature.
 */
const walkIn = db.prepare("SELECT id FROM registrations WHERE school = 'Individual / Walk-in'").get();

if (!walkIn) {
  db.prepare(`
    INSERT INTO registrations (school, contact, email, students, adults, session, date, notes, file_name, status, token)
    VALUES ('Individual / Walk-in', 'N/A', 'walkin@sacth.local', 0, 0, 'N/A', ?, 'Auto-created container for individual sign-ups not linked to a teacher.', '', 'Pending', ?)
  `).run(new Date().toISOString().slice(0, 10), crypto.randomUUID());

  console.log('Created shared "Individual / Walk-in" registration for direct student sign-ups.');
}

module.exports = db;
