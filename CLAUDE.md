# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pou Hono — a small full-stack registration/attendance system for SACTH, built as a proof of concept. Node.js + Express backend, a single-file SQLite database (via `better-sqlite3`), and a plain HTML/CSS/JS front-end.

## Commands

```bash
npm install     # installs express + better-sqlite3
node server.js  # or: npm start — starts the server on http://localhost:3000
```

There is no build step, linter, or test suite configured in this repo (`package.json` only defines `start`).

The SQLite file `pou-hono.db` is created and auto-seeded with example rows on first run, next to `db.js`. Delete it to reset all data — the table/seed logic in `db.js` recreates it.

## Known repo issue: `public/` is a broken submodule reference

`public` is committed as a git submodule (mode `160000`), but there is no `.gitmodules` file, so git can't resolve it — the directory is empty in every checkout. The front-end (`public/index.html` etc., described in README.md) does not currently exist in this working tree. Before doing front-end work, check whether this has been fixed upstream; if not, flag it rather than assuming `public/index.html` exists.

## Architecture

- **`server.js`** — the entire backend: Express app, static file serving of `public/`, request validation, and all REST routes for `/api/registrations` (GET list, POST create, PUT update-or-status-toggle, DELETE). Validation happens both here (`validateRegistration`) and is expected client-side too — the server never trusts client input. All queries use prepared statements (`db.prepare(...).run/get/all(...)`) — never build SQL by string concatenation here.
- **`db.js`** — owns the SQLite connection and schema. Creates the `registrations` table (with a `status` CHECK constraint limited to `'Pending' | 'Arrived'`) if missing, and seeds 5 example rows only on a genuinely empty table (first-ever run). `date` is stored as `YYYY-MM-DD` text specifically so it sorts/filters correctly with plain `>=`/`<=` comparisons — keep that format if adding date logic.
- **`public/`** — intended to hold the entire front-end as static files served directly by Express (no bundler/framework). See the submodule issue above.
- No auth/session layer exists. No file upload storage — `file_name` on a registration is just a filename string, not a stored file.

## Where to add things (from README)

- New API endpoint → `server.js`, following the pattern of an existing route.
- New database column → add to the `CREATE TABLE` in `db.js`, then delete `pou-hono.db` locally so it rebuilds, then update the relevant API validation/clean functions and the front-end form.
- New front-end page → `public/index.html`, copying an existing `<div class="page">` block (single-page-app style, not separate HTML files).

## Scope notes

Per the project proposal, real authentication and multi-device/production deployment are explicitly out of scope for this proof of concept (see README.md "NOT implemented yet"). Don't add auth, HTTPS, or cloud storage unless the user asks — "local storage only, no cloud" is a stated constraint, not an oversight.
