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

Use **Node.js 22 or 24** (`node -v` to check) — `package.json` pins
`engines.node` to `22.x || 24.x`. Then, from this folder:

```bash
npm install                  # 1. install dependencies
cp .env.example .env         # 2. create your settings file  (Windows: copy .env.example .env)
                             # 3. fill in .env — see below
node server.js               # 4. start the server   (or: npm start)
```

Open **http://localhost:3000**. `Ctrl + C` stops the server.

`better-sqlite3` is a native module that compiles during install. npm 12 and
later skip dependency install scripts unless they are approved, so
`package.json` carries an `allowScripts` entry for the locked
`better-sqlite3` version. If you upgrade `better-sqlite3`, update that entry to
the new version (`npm install-scripts approve better-sqlite3`), or installs
will leave the module unbuilt and the server will crash on start with
"Could not locate the bindings file".

On first run the database file `pou-hono.db` is created next to `db.js` (or at `DATABASE_PATH`) and
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
| `TRUST_PROXY` | no | Proxy hop count (e.g. `1`) or Express proxy IP/subnet setting; unset uses the direct connection IP |
| `PUBLIC_BASE_URL` | no | Canonical origin for share/portal links and QR codes (e.g. `https://register.example.nz`); trailing slashes removed; unset uses request protocol/host |
| `NODE_ENV` | production hosting | Set to `production` for HTTPS-only admin cookies; serve over HTTPS |
| `DATABASE_PATH` | no | Where the database file lives. Defaults to `pou-hono.db` next to `db.js`; on a host, point it into the persistent volume (e.g. `/data/pou-hono.db`) |
| `EMAIL_ENABLED` | no | `true` sends confirmation emails; anything else (the default, `false`) just logs them. See [Confirmation emails](#confirmation-emails) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | when emails are on | Your email provider's SMTP server and login (port defaults to `587`; `465` uses TLS from the start) |
| `MAIL_FROM` | when emails are on | The "From" address, on a domain with SPF/DKIM set up |

Set `TRUST_PROXY` to match your host's proxy topology so rate limits use the
client IP. Only trust proxies that overwrite client-supplied forwarding headers.

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

The signed `pou_hono_admin` cookie holds a random session ID backed by the
`admin_sessions` SQLite table. Sessions expire after eight hours, logout deletes
the server session, and changing `ADMIN_PASSWORD_HASH` invalidates all existing
sessions. The cookie is httpOnly, SameSite=Lax, and Secure in production.

### Confirmation emails

`email.js` emails a teacher when they register a class: a thank-you, a
"save the date" box with their event day and the venue, their **student
sign-up link and QR code**, and their **private portal link** (email is the
one place they can find that link again later).

**Right now it sends nothing.** With `EMAIL_ENABLED=false` (the default), each
email is printed to the server console instead — recipient, subject and the
text — so you can see it working in development. The private portal link is
never printed, because it is a credential.

To turn real emails on — it sends over SMTP (via `nodemailer`), which every
provider supports (SendGrid, Mailgun, Resend, Postmark, or the client's own
mail server), so no code changes:

1. In `.env`, set `EMAIL_ENABLED=true` and fill in `SMTP_HOST`, `SMTP_PORT`,
   `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` from your provider.
2. Make sure `MAIL_FROM`'s domain has SPF/DKIM set up, or mail lands in spam.
3. Restart the server and register a test class with your own address.

To use a provider's HTTP API instead of SMTP, replace the body of
`sendEmail()` in `email.js` — the comment at the top has a SendGrid example.

Good to know:

- **Students have no email address to send to.** The student forms don't ask
  for one, so student sign-ups log "no address" and send nothing. The call is
  already in place, so adding an email field later is a small change.
- **An email problem never breaks a registration.** The registration is saved
  first; if sending fails, the error is logged and the person still sees their
  success screen.
- Setting `EMAIL_ENABLED=true` without `SMTP_HOST` and `MAIL_FROM` logs an
  error per email rather than pretending to send.
- The "event details" line in the email is a placeholder until times and
  arrival details are confirmed — edit `detailsPlaceholder` in `email.js`.
  The contact email and phone in the email are written into `email.js` too;
  the venue address is `EVENT_LOCATION` in `server.js`.
- **Railway blocks outbound SMTP on its Hobby plan** (Pro and above only).
  On Hobby, every send fails and is only logged. Either use the Pro plan, or
  use a provider's HTTPS API by replacing `sendEmail()` as described above.

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
their students, and `/register/…` to bookmark for themselves. They carry different
tokens: the student link permits sign-up only; keep the teacher portal link secret.

The home, registration, student sign-up and teacher portal pages — and the
shared header, nav and footer on every page — are translated into **English,
te reo Māori, gagana Sāmoa and lea faka-Tonga** via `public/translations.js`.
The FAQ body and the admin dashboard are English only.

> ⚠️ The Māori, Samoan and Tongan strings are AI-generated and **have not been
> reviewed by fluent speakers**. They must be checked by someone fluent in each
> language before this goes in front of real users.

---

## Who can see what

Three levels of access, and every API route sits behind one of them:

- **Public** — anyone. Can create a registration, and can sign a student up if
  they hold a valid link token. Cannot read anybody's data.
- **Teacher** — holds the secret token from their own portal link. Can see and manage
  **only their own class**. No password: the unguessable token *is* the
  credential, while the separate student link can be shared with the whole class.
- **Admin** — logged in with the admin password. Can see everything.

### The API

| Method | URL | Access |
|---|---|---|
| POST | `/api/admin/login` | public (rate limited) |
| POST | `/api/admin/logout` | public |
| GET | `/api/admin/session` | public — reports whether you are logged in |
| GET | `/api/admin/students` | **admin** — every student, in one query |
| GET | `/api/admin/export/pdf` | **admin** — every student and teacher registration as a printable PDF (no ages or allergies) |
| GET | `/api/registrations` | **admin** |
| PUT | `/api/registrations/:id` | **admin** — full edit, or just the status toggle |
| POST | `/api/registrations/:id/teacher-link` | **admin** — replaces the teacher portal link; old link stops working |
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

Startup adds and uniquely indexes `teacher_token`, backfilling existing classes
with fresh UUIDs. Walk-ins retain a NULL teacher token. Existing student links
keep working; old teacher portal links must be replaced after this upgrade.
Creation returns `link`, `qrCode`, and `portalLink`, without raw token fields.

A teacher token is sent either as `Authorization: Bearer <token>` or as
`?token=<token>`.

`GET /api/registrations` never returns the `token` or `teacher_token` columns — the routes select
explicit columns rather than `SELECT *`, so a new column can never leak by
accident.

**Rate limits:** registration creation is 20/hour per IP; admin login is
10 per 15 minutes per IP. Public student sign-ups allow 100/hour per class
token and IP (60/hour for the public walk-in token), plus a 600/hour IP abuse
ceiling including invalid tokens. Invalid tokens do not consume class budgets.
Teacher manual adds have a separate 200/hour budget per authenticated teacher
token. These in-memory limits reset when the server restarts.

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
- **`email.js`** — the confirmation email: builds the HTML and text bodies
  and sends them over SMTP with `nodemailer`, or logs them while
  `EMAIL_ENABLED` is not `true`.
- **`db.js`** — the SQLite connection and the schema. Creates the
  `registrations` and `students` tables, upgrades an existing database in place
  via an idempotent `ALTER TABLE`, and seeds example data only on a genuinely
  empty table.
- **`public/`** — the entire front-end as static files. `nav.js` injects the
  shared nav and footer, `translations.js` swaps the four languages via
  `data-i18n` attributes, `event-days.js` holds the event dates,
  `schools.js` holds the South Auckland school list behind the "Search your
  school…" box, and `vendor/chart.umd.js` is the self-hosted Chart.js.
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
- **Renaming or changing a workshop** → the names must match everywhere:
  `validSessions` in `validateStudent` (`server.js`), the session choices in
  `student.html`, `teacher.html` and `register.html`, the flip cards on
  `index.html`, the matching strings in `translations.js`, and the seed data
  in `db.js`. Existing student rows keep their old value unless you migrate
  them (see the one-time rename in `db.js`).

## Not in this repo yet

Handled separately, or still to do:

- Hosting and deployment (the code is ready for Railway: `PORT` and
  `DATABASE_PATH` come from the environment and `npm start` runs the server)
- Connecting a real email provider (the confirmation email itself is built —
  see [Confirmation emails](#confirmation-emails))
- Native-speaker review of the Māori, Samoan and Tongan translations
- Load testing to the brief's 1,000-user target. SQLite in WAL mode on one
  server should cope, but it has not been measured, and it limits the site to
  a single instance; moving to PostgreSQL would mean porting `db.js` and every
  query in `server.js`
- Admin editing or removal of a single student. There is no route or UI for
  it, so an individual (walk-in) sign-up cannot be removed through the site
- Confirmation emails to students or individuals — the forms collect no
  email address
- Storing uploaded files — `file_name` is a filename string, not a stored file

The admin PDF export draws names in Arial, DejaVu Sans or Liberation Sans from
fixed system paths, and falls back to Helvetica (which mangles macrons and
ʻokina) if none is installed. After deploying to a new host, export a PDF that
includes a name with a macron and check it.

## Security headers

`server.js` sets security headers before all other middleware: `Referrer-Policy:
no-referrer` protects secret teacher URLs, `nosniff` prevents MIME sniffing, and
`X-Frame-Options: DENY` / CSP `frame-ancestors 'none'` prevent framing this site.
The CSP permits same-origin resources and fetches, data-image QR codes, and the
Google Maps iframe. Chart.js is self-hosted in `public/vendor/`, so the CSP's
remaining `https://cdnjs.cloudflare.com` script source is unused and can be
removed. Scripts and styles currently require
`'unsafe-inline'`; moving them into external files is separate work. There are
no Google Fonts loads. Adding a new external resource requires updating the CSP
and checking the affected pages in a browser. HSTS belongs to hosting/TLS.
