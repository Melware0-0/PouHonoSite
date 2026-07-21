# Pou Hono — Community Data System

A full-stack registration and attendance system (proof of concept)
Front-end (HTML/CSS/JS) + back-end (Node.js + Express) + local database (SQLite).

---

## How to run it

You need **Node.js** installed (version 18 or newer — check with `node -v`).
Download from https://nodejs.org if you don't have it.

Then, in a terminal, from this folder:

```bash
npm install     # 1. downloads the two dependencies (express, better-sqlite3)
node server.js  # 2. starts the server
```

Then open **http://localhost:3000** in your browser.

Press `Ctrl + C` in the terminal to stop the server.

> First run: the database file `pou-hono.db` is created automatically and
> seeded with a few example records. Delete that file to reset all data.

---

## How the pieces fit together

```
 Browser (front-end)                    Server (back-end)
┌──────────────────────┐    HTTP     ┌──────────────────┐     ┌─────────────┐
│  public/index.html   │ ─────────►  │    server.js     │ ──► │ pou-hono.db │
│  pages, forms, charts│   fetch()   │  Express + API   │     │   SQLite    │
│                      │ ◄─────────  │  validation      │ ◄── │  (one file) │
└──────────────────────┘    JSON     └──────────────────┘     └─────────────┘
```

- **public/index.html** — everything the user sees. When it needs data it
  calls the API with `fetch()` and renders whatever comes back.
- **server.js** — the web server. Serves the front-end AND answers API
  requests. Validates all incoming data before it touches the database.
- **db.js** — creates the SQLite table on first run and exports the
  database connection.
- **pou-hono.db** — the actual data, as a single file. This is what makes
  the system "local storage only, no cloud": the data never leaves this
  machine.

### The API (how front and back talk)

| Method | URL                      | What it does                          |
|--------|--------------------------|---------------------------------------|
| GET    | /api/registrations       | List all records                      |
| POST   | /api/registrations       | Create a record (validated)           |
| PUT    | /api/registrations/:id   | Update a record, or just its status   |
| DELETE | /api/registrations/:id   | Delete a record                       |

Try it yourself with the browser open at http://localhost:3000/api/registrations —
you'll see the raw JSON the front-end works from.

---

## What's implemented 

- **FR1** Digital data entry — registration form, saved to the database
- **FR2** File upload — filename is captured and stored (see "Next steps")
- **FR3** Validation — in the browser (instant feedback) AND on the server
- **FR4** Local storage — SQLite database file, no cloud
- **FR5** Search & filter — attendance and records pages
- **FR6** Attendance stats — totals, unique schools, repeat-visitor detection
- **FR7** Trends — visitors-per-day bar charts on dashboard and reports
- **FR8** Exports — CSV download; PDF via the browser print dialog
- **FR9** Custom reports — date-range selection recalculates everything
- **FR10** Dashboard — stats, quick actions, recent registrations

## NOT implemented yet (good future sprints)

- **Real login** — the login page is a placeholder that routes to a portal.
  Complex authentication is out of scope per the proposal; a basic version
  would add a users table + sessions to server.js.
- **Storing uploaded files** — only the filename is saved. Storing the file
  itself would use the `multer` npm package and a `/uploads` folder.
- **Multi-device access** — works already on one network: other devices can
  open `http://<this-computer's-IP>:3000`. A production deployment would
  need HTTPS and authentication first.

## Where to add things

- New API endpoint → `server.js` (copy the pattern of an existing route)
- New database column → `db.js` (the CREATE TABLE), then delete
  `pou-hono.db` so the table is rebuilt, then update the form + API
- New page → `public/index.html` (copy an existing `<div class="page">`)
