# Pou Hono

The registration website for **NZ Tech Week 2027**, run by
[SACTH](https://sacth.nz/) (South Auckland Creative Tech Hub) and
[The Cause Collective](https://thecausecollective.org.nz/) for South Auckland
schools.

A teacher registers their class and is handed a shareable link and a QR code.
Students open that link and register themselves — their details are grouped
automatically under their teacher's class. Teachers who would rather type the
students in themselves can do that instead, from their own portal. Individuals
from the community can register without a school at all.

Node.js + Express, a single-file SQLite database, and plain HTML/CSS/JS served
as static files. **No bundler, no framework, no build step** — you edit a file
and reload the page.

> **Why it is built in-house:** data sovereignty. The database is one file on
> the machine running the server. Nothing is sent to a third-party service.
> The data includes children's names, ages and allergies, which is why the
> access rules below are the way they are.

---

## Running it

You need **Node.js 18 or newer** (`node -v` to check). Then, from this folder:

```bash
npm install                  # 1. install dependencies
cp .env.example .env         # 2. create your settings file  (Windows: copy .env.example .env)
                             # 3. fill in .env — see below
node server.js               # 4. start the server   (or: npm start)
```

Open **http://localhost:3000**. `Ctrl + C` stops the server.

On first run the database file `pou-hono.db` is created next to `db.js` and
seeded with example classes and students so the admin dashboard demos properly.
Delete that file to reset everything.

### Settings (`.env`)

`.env` holds the secrets and is **not** committed — it is in `.gitignore`.
`.env.example` is the committed template and explains each value; this is the
short version.

| Variable | Required | What it is |
|---|---|---|
| `ADMIN_PASSWORD_HASH` | yes, for the admin dashboard | A **bcrypt hash** of the admin password — never the password itself |
| `SESSION_SECRET` | yes, for the admin dashboard | A long random string used to sign the admin login cookie |
| `PORT` | no | Port to listen on. Defaults to `3000` |

Generate the two values:

```bash
# ADMIN_PASSWORD_HASH  (replace YourPasswordHere with the real password)
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'YourPasswordHere'

# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

If either is missing the server still starts and every public page works — it
prints a loud warning and admin login refuses every attempt. It **fails
closed**: an unconfigured server is never an open one.

### Changing the event dates

The three event days live in exactly one place: **`public/event-days.js`**.
Change them there and nowhere else — the registration form, the teacher portal,
the admin table and the seed data all read that file.

The dates currently in it are **placeholders** pending confirmation from SACTH.

---

## The pages

| URL | Who it is for |
|---|---|
| `/` | Home — about the event, live registration counter |
| `/register.html` | Registration — teacher path and individual path |
| `/register/:token` | **Teacher portal.** A teacher's way back into their own class |
| `/join/:token` | **Student self-registration.** The link and QR a teacher shares |
| `/student.html` | Individual sign-up, no teacher involved |
| `/faq.html` | FAQ |
| `/admin.html` | Admin dashboard — password protected |

A teacher finishing registration is given **both** links: `/join/…` to hand to
their students, and `/register/…` to bookmark for themselves. Both carry the
same token.

The registration, student sign-up and teacher portal pages are translated into
**English, te reo Māori, gagana Sāmoa and lea faka-Tonga** via
`public/translations.js`.

> ⚠️ The Māori, Samoan and Tongan strings are AI-generated and **have not been
> reviewed by fluent speakers**. They must be checked by someone fluent in each
> language before this goes in front of real users.

---

## Who can see what

Three levels of access, and every API route sits behind one of them:

- **Public** — anyone. Can create a registration, and can sign a student up if
  they hold a valid link token. Cannot read anybody's data.
- **Teacher** — holds the secret token from their own link. Can see and manage
  **only their own class**. No password: the unguessable token *is* the
  credential, which is what lets a teacher share a link with thirty students
  without handing out an account.
- **Admin** — logged in with the admin password. Can see everything.

### The API

| Method | URL | Access |
|---|---|---|
| POST | `/api/admin/login` | public (rate limited) |
| POST | `/api/admin/logout` | public |
| GET | `/api/admin/session` | public — reports whether you are logged in |
| GET | `/api/admin/students` | **admin** — every student, in one query |
| GET | `/api/registrations` | **admin** |
| PUT | `/api/registrations/:id` | **admin** — full edit, or just the status toggle |
| DELETE | `/api/registrations/:id` | **admin** |
| GET | `/api/registrations/:id/students` | **admin** |
| POST | `/api/registrations` | public (rate limited) — a teacher registering a class |
| GET | `/api/registrations/count` | public — the home page counter |
| GET | `/api/registrations/token/:token` | public — what the student page needs to show |
| GET | `/api/walk-in-registration` | public — the token individuals sign up under |
| POST | `/api/registrations/token/:token/students` | public + valid token (rate limited) |
| GET | `/api/my-registration` | **teacher token** |
| GET | `/api/my-registration/qr` | **teacher token** — the share link and its QR |
| GET | `/api/my-registration/students` | **teacher token** |
| POST | `/api/my-registration/students` | **teacher token** (rate limited) |
| DELETE | `/api/my-registration/students/:studentId` | **teacher token** |

A teacher token is sent either as `Authorization: Bearer <token>` or as
`?token=<token>`.

`GET /api/registrations` never returns the `token` column — the routes select
explicit columns rather than `SELECT *`, so a new column can never leak by
accident.

**Rate limits** (per IP): 20/hour on creating a registration, 60/hour on adding
students (high enough that a teacher can type in a whole class), 10 per 15
minutes on admin login.

---

## How the pieces fit together

```
 Browser (front-end)                    Server (back-end)
┌──────────────────────┐    HTTP     ┌──────────────────┐     ┌─────────────┐
│  public/*.html       │ ─────────►  │    server.js     │ ──► │ pou-hono.db │
│  forms, QR, charts   │   fetch()   │  Express + API   │     │   SQLite    │
│                      │ ◄─────────  │  auth+validation │ ◄── │  (one file) │
└──────────────────────┘    JSON     └──────────────────┘     └─────────────┘
```

- **`server.js`** — the whole back-end. Serves `/public`, answers the API,
  owns the `requireAdmin` and `requireTeacherToken` gatekeepers, and validates
  everything before it touches the database. Every query is a prepared
  statement (`db.prepare(...)` with `?` placeholders) — never build SQL by
  string concatenation here.
- **`db.js`** — the SQLite connection and the schema. Creates the
  `registrations` and `students` tables, upgrades an existing database in place
  via an idempotent `ALTER TABLE`, and seeds example data only on a genuinely
  empty table.
- **`public/`** — the entire front-end as static files. `nav.js` injects the
  shared nav and footer, `translations.js` swaps the four languages via
  `data-i18n` attributes, `event-days.js` holds the event dates.
- **`pou-hono.db`** — the data, as one file. Gitignored.

`date` is stored as `YYYY-MM-DD` text specifically so it sorts and filters
correctly with plain `>=` / `<=` comparisons. Keep that format.

---

## Where to add things

- **New API endpoint** → `server.js`, following an existing route — and decide
  which gatekeeper it needs (`requireAdmin`, `requireTeacherToken`, or public).
- **New database column** → add it to the `CREATE TABLE` in `db.js` *and* to
  the `addColumnIfMissing(...)` call below it, so existing databases upgrade in
  place. Then update the validation/clean functions in `server.js`, the
  explicit column lists, and the form.
- **New front-end page** → a new file in `public/`, copying the structure of an
  existing page (nav placeholder, `styles.css`, `nav.js`, and `translations.js`
  if it needs the language switcher).
- **New event dates** → `public/event-days.js`, and nowhere else.

## Not in this repo yet

Handled separately, or still to do:

- Hosting and deployment; the auto-reply confirmation email
- School-name search behind the "Search your school…" box on the teacher form
- Real logo, event photography, and session images/descriptions
- Native-speaker review of the Māori, Samoan and Tongan translations
- Load testing to the brief's 1,000-user target
- Storing uploaded files — `file_name` is a filename string, not a stored file

## Security headers

`server.js` sets security headers before all other middleware: `Referrer-Policy:
no-referrer` protects secret teacher URLs, `nosniff` prevents MIME sniffing, and
`X-Frame-Options: DENY` / CSP `frame-ancestors 'none'` prevent framing this site.
The CSP permits same-origin resources and fetches, data-image QR codes, Chart.js
from cdnjs, and the Google Maps iframe. Scripts and styles currently require
`'unsafe-inline'`; moving them into external files is separate work. There are
no Google Fonts loads. Adding a new external resource requires updating the CSP
and checking the affected pages in a browser. HSTS belongs to hosting/TLS.
