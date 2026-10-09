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

// Load local settings even when a maintenance script imports db.js directly.
// Existing environment variables (including host-provided settings) take precedence.
require('dotenv').config();

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// The three event days, read from the one file that defines them
// (public/event-days.js) rather than retyped here. The seed data below
// dates itself off these, so if the dates change in that file the demo
// data follows automatically instead of quietly going stale.
const EVENT_DAYS = require('./public/event-days.js');

// Open (or create) the database file. By default it sits next to this
// script. DATABASE_PATH overrides that, which a host needs when only one
// folder (a mounted "volume") survives restarts and redeploys, e.g.
// DATABASE_PATH=/data/pou-hono.db on Railway.
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'pou-hono.db');
const db = new Database(DATABASE_PATH);

// WAL mode = safer writes if the app crashes mid-save. One line, free win.
db.pragma('journal_mode = WAL');

// Enforce the students.registration_id foreign key (SQLite doesn't by default).
db.pragma('foreign_keys = ON');

// Admin credentials stay server-side; timestamps are Unix milliseconds.
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    password_fingerprint TEXT NOT NULL
  )
`);


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
 *               that students use to self-register under this class.
 *  - teacher_token: separate secret UUID for /register/:token and teacher APIs
 *  - is_walk_in: 1 only for the shared system container. This is a durable
 *               identity flag; school is display text and is not unique.
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
    token     TEXT    UNIQUE,
    teacher_token TEXT,
    is_walk_in INTEGER NOT NULL DEFAULT 0 CHECK (is_walk_in IN (0, 1))
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
addColumnIfMissing('registrations', 'is_walk_in', 'INTEGER NOT NULL DEFAULT 0 CHECK (is_walk_in IN (0, 1))');
addColumnIfMissing('registrations', 'teacher_token', 'TEXT');
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS registrations_teacher_token
  ON registrations (teacher_token) WHERE teacher_token IS NOT NULL
`);

// SQLite cannot ADD COLUMN with UNIQUE, so on an older database `token`
// arrives as plain TEXT. Give any row that predates it a token of its own
// (otherwise that class has no link at all), then enforce uniqueness with
// an index instead. On a new database the CREATE TABLE's UNIQUE already
// covers it and this index is simply redundant.
addColumnIfMissing('registrations', 'token', 'TEXT');

const rowsWithoutToken = db.prepare('SELECT id FROM registrations WHERE token IS NULL').all();
if (rowsWithoutToken.length > 0) {
  const setToken = db.prepare('UPDATE registrations SET token = ? WHERE id = ?');
  db.transaction(() => {
    rowsWithoutToken.forEach(({ id }) => setToken.run(crypto.randomUUID(), id));
  })();
  console.log(`Database upgraded: gave ${rowsWithoutToken.length} registration(s) a link token.`);
}

db.exec('CREATE UNIQUE INDEX IF NOT EXISTS registrations_token_unique ON registrations (token)');

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
 *
 * The seed deliberately has the same SHAPE as data the live app writes,
 * because demo data that lies about the shape of real data is worse than
 * no demo data at all:
 *  - `session` on a registration is the whole-event name
 *    ('NZ Tech Week 2027'), which is exactly what the teacher form posts.
 *    The five things a person actually picks between — Robotics, Gaming,
 *    Programming, Computer Building, Social Media — are per-STUDENT
 *    choices, so they live in students.preferred_session further down.
 *  - `date` is one of the three event days, taken from EVENT_DAYS rather
 *    than typed out again, and the classes are spread over all three.
 *
 * `key` is not a database column. It is only here so the student seed
 * below can say "put these children in the Mangere College class"
 * without having to guess at auto-increment ids.
 */
const rowCount = db.prepare('SELECT COUNT(*) AS n FROM registrations').get().n;

// Filled in with { key: id } if — and only if — we seed on this run.
// Left null on every later startup, which is what stops the student seed
// from ever attaching demo children to somebody's real class.
let seededRegistrationIds = null;

if (rowCount === 0) {
  const insert = db.prepare(`
    INSERT INTO registrations (school, contact, email, students, adults, not_attending, session, date, notes, status, token, teacher_token)
    VALUES (@school, @contact, @email, @students, @adults, @not_attending, @session, @date, @notes, @status, @token, @teacher_token)
  `);

  const [day1, day2, day3] = EVENT_DAYS.map((d) => d.date);
  const EVENT = 'NZ Tech Week 2027';

  const seedRows = [
    { key: 'papatoetoe', school: 'Papatoetoe Intermediate', contact: 'S. Tuilagi', email: 'office@papatoetoeint.school.nz', students: 32, adults: 3, not_attending: 2, session: EVENT, date: day1, notes: '', status: 'Arrived' },
    { key: 'manurewa', school: 'Manurewa Primary', contact: 'J. Fale', email: 'admin@manurewaprimary.school.nz', students: 25, adults: 2, not_attending: 0, session: EVENT, date: day2, notes: 'Two students need wheelchair access', status: 'Arrived' },
    { key: 'otara', school: 'Otara Youth Group', contact: 'M. Ropati', email: 'contact@otarayouth.org.nz', students: 18, adults: 4, not_attending: 0, session: EVENT, date: day3, notes: '', status: 'Pending' },
    { key: 'mangere', school: 'Mangere College', contact: 'A. Havili', email: 'reception@mangere.school.nz', students: 40, adults: 3, not_attending: 3, session: EVENT, date: day1, notes: 'Te reo Māori support requested', status: 'Pending' },
    // Same school as row 2 on purpose: the dashboard has a "repeat
    // visitor" idea that needs one school to appear more than once.
    { key: 'manurewa-repeat', school: 'Manurewa Primary', contact: 'J. Fale', email: 'admin@manurewaprimary.school.nz', students: 22, adults: 2, not_attending: 0, session: EVENT, date: day3, notes: 'Repeat visit', status: 'Arrived' }
  ].map((row) => ({ ...row, token: crypto.randomUUID(), teacher_token: crypto.randomUUID() }));

  // A transaction = "do all of these inserts, or none of them".
  const seedAll = db.transaction((rows) => {
    const ids = {};
    rows.forEach(({ key, ...row }) => {
      ids[key] = insert.run(row).lastInsertRowid;
    });
    return ids;
  });
  seededRegistrationIds = seedAll(seedRows);

  console.log('Database created and seeded with example data.');
}

/**
 * Shared container registration for individual sign-ups that arrive
 * without a teacher's link (see students table comment above). Created
 * once and reused — checked on every startup so it self-heals on an
 * existing database that predates this feature.
 *
 * `is_walk_in`, not the editable school display name, identifies this row.
 * Older databases predate that flag, so mark their existing container once.
 * The oldest matching row is the same row the old `.get()` lookup used. This
 * preserves its attached students and, importantly, keeps its public token
 * denied teacher powers after the upgrade.
 */
let walkIn = db.prepare('SELECT id FROM registrations WHERE is_walk_in = 1').get();

if (!walkIn) {
  const legacyWalkIn = db.prepare(`
    SELECT id FROM registrations
    WHERE school = 'Individual / Walk-in'
    ORDER BY id
    LIMIT 1
  `).get();

  if (legacyWalkIn) {
    db.prepare('UPDATE registrations SET is_walk_in = 1 WHERE id = ?').run(legacyWalkIn.id);
    walkIn = legacyWalkIn;
    console.log('Database upgraded: marked the existing walk-in container.');
  }
}

// There must be exactly one system container, while any number of genuine
// classes may happen to use the same display name.
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS registrations_one_walk_in
  ON registrations (is_walk_in)
  WHERE is_walk_in = 1
`);

// Its id, however it got here — found or just created. The student seed
// below needs it so that the dashboard's walk-in count is not zero.
let walkInId = walkIn ? walkIn.id : null;

if (!walkIn) {
  walkInId = db.prepare(`
    INSERT INTO registrations (school, contact, email, students, adults, session, date, notes, file_name, status, token, is_walk_in)
    VALUES ('Individual / Walk-in', 'N/A', 'walkin@sacth.local', 0, 0, 'N/A', ?, 'Auto-created container for individual sign-ups not linked to a teacher.', '', 'Pending', ?, 1)
  `).run(new Date().toISOString().slice(0, 10), crypto.randomUUID()).lastInsertRowid;

  console.log('Created shared "Individual / Walk-in" registration for direct student sign-ups.');
}

// Run after legacy walk-in identification: only classes get teacher credentials.
// Clear any credential on the public container, including on later startups.
db.transaction(() => {
  db.prepare('UPDATE registrations SET teacher_token = NULL WHERE is_walk_in = 1').run();
  const missing = db.prepare('SELECT id FROM registrations WHERE is_walk_in = 0 AND teacher_token IS NULL').all();
  const backfill = db.prepare('UPDATE registrations SET teacher_token = ? WHERE id = ?');
  for (const row of missing) backfill.run(crypto.randomUUID(), row.id);
})();

/**
 * Seed students — same "only on a genuinely empty table" rule as above.
 *
 * Two guards, not one. `seededRegistrationIds` is only set on the run
 * that created the example classes, so demo children can never be
 * attached to a real teacher's class on a database that already has
 * registrations in it. The COUNT is belt-and-braces for the odd case of
 * a half-built database.
 *
 * The five preferred_session values are all represented, because the
 * admin dashboard draws a pie chart of them and picks a "most popular
 * session" out of them — with an empty students table both of those just
 * say "nothing yet", which demos badly. A couple of the children sit
 * under the walk-in registration so the individual sign-up stat is
 * non-zero too, and a few carry allergies so that column shows what it
 * is for.
 */
const studentCount = db.prepare('SELECT COUNT(*) AS n FROM students').get().n;

if (seededRegistrationIds && studentCount === 0) {
  const insertStudent = db.prepare(`
    INSERT INTO students (registration_id, name, age, year_group, allergies, preferred_session)
    VALUES (@registration_id, @name, @age, @year_group, @allergies, @preferred_session)
  `);

  const seedStudents = [
    // Papatoetoe Intermediate
    { reg: 'papatoetoe', name: 'Aroha Ngata', age: 12, year_group: 'Year 7', allergies: '', preferred_session: 'Robotics' },
    { reg: 'papatoetoe', name: 'Sione Vaka', age: 12, year_group: 'Year 8', allergies: 'Peanuts', preferred_session: 'Gaming' },
    { reg: 'papatoetoe', name: 'Mele Latu', age: 13, year_group: 'Year 8', allergies: '', preferred_session: 'Programming' },
    { reg: 'papatoetoe', name: 'Riya Patel', age: 12, year_group: 'Year 7', allergies: '', preferred_session: 'Robotics' },

    // Manurewa Primary
    { reg: 'manurewa', name: 'Tane Wiremu', age: 10, year_group: 'Year 6', allergies: 'Asthma — inhaler carried', preferred_session: 'Gaming' },
    { reg: 'manurewa', name: 'Lupe Faleolo', age: 10, year_group: 'Year 6', allergies: '', preferred_session: 'Social Media' },
    { reg: 'manurewa', name: 'Jacob Tuipulotu', age: 11, year_group: 'Year 6', allergies: '', preferred_session: 'Computer Building' },

    // Otara Youth Group
    { reg: 'otara', name: 'Anaru Rewiti', age: 15, year_group: 'Year 10', allergies: '', preferred_session: 'Programming' },
    { reg: 'otara', name: 'Sina Tialavea', age: 14, year_group: 'Year 9', allergies: 'Dairy', preferred_session: 'Social Media' },
    { reg: 'otara', name: 'Deshaun Kaur', age: 15, year_group: 'Year 10', allergies: '', preferred_session: 'Robotics' },

    // Mangere College
    { reg: 'mangere', name: 'Kalolaine Fifita', age: 16, year_group: 'Year 11', allergies: '', preferred_session: 'Computer Building' },
    { reg: 'mangere', name: 'Hemi Paora', age: 17, year_group: 'Year 12', allergies: '', preferred_session: 'Programming' },
    { reg: 'mangere', name: 'Ana Toluta’u', age: 16, year_group: 'Year 11', allergies: 'Shellfish', preferred_session: 'Gaming' },
    { reg: 'mangere', name: 'Priya Singh', age: 17, year_group: 'Year 12', allergies: '', preferred_session: 'Social Media' },

    // Manurewa Primary, second visit
    { reg: 'manurewa-repeat', name: 'Nikau Heke', age: 11, year_group: 'Year 7', allergies: '', preferred_session: 'Robotics' },
    { reg: 'manurewa-repeat', name: 'Talia Ropati', age: 10, year_group: 'Year 6', allergies: '', preferred_session: 'Computer Building' },

    // Individual sign-ups, no teacher involved
    { reg: 'walk-in', name: 'Josiah Leota', age: 14, year_group: 'Year 9', allergies: '', preferred_session: 'Programming' },
    { reg: 'walk-in', name: 'Maia Thompson', age: 13, year_group: 'Year 9', allergies: 'Gluten', preferred_session: 'Gaming' }
  ];

  const seedAllStudents = db.transaction((rows) => {
    rows.forEach(({ reg, ...row }) => {
      insertStudent.run({
        ...row,
        registration_id: reg === 'walk-in' ? walkInId : seededRegistrationIds[reg]
      });
    });
  });
  seedAllStudents(seedStudents);

  console.log('Seeded example students across the five sessions.');
}

module.exports = db;
