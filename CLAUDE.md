# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pou Hono — the registration website for **NZ Tech Week 2027**, built for SACTH
(South Auckland Creative Tech Hub) and The Cause Collective, for South Auckland
schools.

A teacher registers their class and gets a shareable link and QR code. Students
open that link and register themselves, grouped automatically under their
teacher. Teachers can also type students in themselves from their own portal.
Individuals can register without a school at all.

Node.js + Express 5, a single-file SQLite database (`better-sqlite3`), and a
plain HTML/CSS/JS front-end served as static files.

**The data is children's names, ages and allergies.** Data sovereignty is the
stated reason the client had this built in-house rather than buying a SaaS
product. That is why the access rules below exist and why they are not
negotiable.

## Commands

```bash
npm install     # install dependencies
node server.js  # or: npm start — serves on http://localhost:3000
```

There is **no build step, no bundler, no linter and no test suite**
(`package.json` defines only `start`). Do not add one unless asked. You edit a
file and reload the page.

The server needs a `.env` before the admin dashboard works — see below.

The SQLite file `pou-hono.db` is created next to `db.js` on first run and seeded
with example classes and students. Delete it to reset all data; the schema and
seed logic in `db.js` rebuild it.

## Environment (`.env`)

`.env` is gitignored. `.env.example` is the committed template and documents
each value with the exact command that generates it.

- `ADMIN_PASSWORD_HASH` — a **bcrypt hash** of the admin password, never the
  password. Generate with
  `node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'YourPassword'`
- `SESSION_SECRET` — long random string signing the admin cookie. Generate with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `PORT` — optional, defaults to 3000.
- `EMAIL_ENABLED` — `true` sends confirmation emails via `email.js`; anything
  else just logs them. `email.js`'s `sendEmail()` is a stub that throws until a
  provider is wired in. Sending is never awaited by a route: a registration
  must succeed even if email fails.

If either secret is missing the server still starts and every public page works;
it prints a warning and admin login refuses every attempt. It **fails closed** —
never treat an unconfigured server as an open one.

## The three access levels

Every API route sits behind exactly one of these. When adding a route, the first
question is which one it needs.

- **Public** — anyone. Can create a registration, and can sign a student up if
  they hold a valid link token. Cannot read anybody's data.
- **Teacher** — holds the secret token from their own link. `requireTeacherToken`
  reads it from an `Authorization: Bearer` header or `?token=`, looks up the
  registration and attaches it as `req.registration`. There is no teacher
  account or password: the unguessable token *is* the credential.
- **Admin** — `requireAdmin` checks a signed httpOnly cookie set by
  `POST /api/admin/login` (bcrypt compare against `ADMIN_PASSWORD_HASH`).

Two rules that are easy to break by accident:

- **Inside `requireTeacherToken`, a missing, unknown, or rejected token must
  return the identical 404.** If they differ, someone probing that API gate can
  enumerate valid tokens. Page routes have their own documented behavior.
- **The "Individual / Walk-in" registration's token is public** (handed out by
  `GET /api/walk-in-registration` so individuals can sign up). It must therefore
  never satisfy `requireTeacherToken` or open the teacher portal. It is
  identified by the database's `is_walk_in` flag, never by its editable school
  display name; `server.js` centralizes the test in `isWalkInRegistration(reg)`.

## Architecture

- **`server.js`** — the entire backend: the Express app, static serving of
  `public/`, the two gatekeeper middlewares, rate limiting, validation, and
  every route. All queries use prepared statements (`db.prepare(...)` with `?`
  placeholders) — **never build SQL by string concatenation here.** Routes
  select **explicit columns** rather than `SELECT *` on `registrations`, so a
  new column can never leak into a response by accident; keep that pattern.
- **`db.js`** — owns the SQLite connection and schema. Creates `registrations`
  (with a `status` CHECK constraint of `'Pending' | 'Arrived'`) and `students`,
  upgrades existing databases in place via `addColumnIfMissing(...)`, and seeds
  example data only on a genuinely empty table. `date` is stored as `YYYY-MM-DD`
  text specifically so it sorts and filters with plain `>=` / `<=` — keep that
  format.
- **`public/`** — the whole front-end as static files, no framework:
  - `index.html` (home), `register.html` (teacher + individual paths),
    `teacher.html` (the teacher's class portal), `student.html` (student
    self-registration), `admin.html` (dashboard), `faq.html`
  - `nav.js` injects the shared nav and footer into every page
  - `translations.js` swaps four languages via `data-i18n` attributes
  - `event-days.js` holds the three event dates
  - `styles.css`
- **`pou-hono.db`** — the data, one file, gitignored. No cloud, by design.

### Routes

Page routes: `/join/:token` serves the **student** sign-up page (this is the
link and QR a teacher shares); `/register/:token` serves the **teacher** portal.
Both take the same token; an unknown token on either redirects to `/`.

| Route | Gate |
|---|---|
| `POST /api/admin/login` · `logout` · `GET /api/admin/session` | public (login is rate limited) |
| `GET /api/admin/students` | admin — every student in one query |
| `GET /api/admin/export/pdf` | admin — all students + teacher registrations as a PDF (pdfkit) |
| `GET /api/registrations` · `PUT`/`DELETE /api/registrations/:id` · `GET /api/registrations/:id/students` | admin |
| `POST /api/registrations` | public, rate limited |
| `GET /api/registrations/count` · `/api/registrations/token/:token` · `/api/walk-in-registration` | public |
| `POST /api/registrations/token/:token/students` | public + valid token, rate limited |
| `GET /api/my-registration` · `/qr` · `/students`, `POST`/`DELETE .../students` | teacher token |

## Where to add things

- **New API endpoint** → `server.js`, following an existing route, and pick its
  gatekeeper deliberately.
- **New database column** → add it to the `CREATE TABLE` in `db.js` **and** add
  an `addColumnIfMissing(...)` call below it, so existing databases upgrade in
  place rather than needing to be deleted. If it is user-facing, also update the
  relevant validation/cleaning functions, explicit response column lists, and
  form; internal columns must not be accepted from public request bodies.
- **New front-end page** → a new file in `public/`, copying an existing page's
  structure (nav placeholder, `styles.css`, `nav.js`, and `translations.js` if
  it needs the language switcher). These are separate pages, not one SPA.
- **Changing the event dates** → `public/event-days.js` and nowhere else. It is
  loaded both by Node (`require('./public/event-days.js')`) and by the browser
  (`<script src="/event-days.js">`), which is what keeps the dates defined once.

## Front-end conventions

- The pages build rows with template literals and `innerHTML`. **Every
  user-supplied value must go through the page's `escapeHtml` helper** (or be
  set with `textContent`). Student names and allergy text arrive through a
  public endpoint, so they are attacker-controlled.
- Translated strings live in `translations.js` keyed by `data-i18n` /
  `data-i18n-placeholder`, in all four languages: `en`, `mi`, `sm`, `to`. Add a
  new string to **all four** or the switcher falls back to English for it.
  Text a page script sets itself goes through `i18nText(key, {vars})` (set it
  with `textContent`). `data-i18n-html` is only for the few strings in
  `translations.js` that carry markup, never for user input. Every page loads
  `translations.js` before `nav.js`, so the shared header, nav and footer
  translate everywhere.
- ⚠️ The mi/sm/to strings are AI-generated and **not reviewed by fluent
  speakers**. The file header says so. Keep that warning, and don't present
  them as finished.

## Scope notes

Handled separately or deliberately not built: hosting and deployment,
connecting a real email provider, school-name search behind the "Search your
school…" box, real logo and event imagery, and load testing to the brief's
1,000-user target. `file_name` on a registration is just a filename string — no
file is stored. Don't add these unless asked.
