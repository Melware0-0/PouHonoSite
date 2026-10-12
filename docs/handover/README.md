# Pou Hono — client handover document

- `Pou-Hono-Handover.pdf` — the final handover document for SACTH and The
  Cause Collective (v1.2, 12 October 2026). Part A is plain language for the
  client, including step-by-step guides for going live on Railway, email,
  the database, languages and personalisation; Part B is the technical
  reference.
- `handover.html` — its source. The PDF is this page printed to A4 from
  Chromium with background graphics on (`printBackground: true`), loaded from
  this folder so the relative image paths resolve. `shots/` and the two logos
  are the images it references.

v1.2 describes `main` at `70fda57` (PR #18), with every fix branch and the
`schoolsearch`, `feature/workshops-i18n-pdf-email` and `email` branches
merged. Nothing is awaiting merge.

The screenshots in `shots/` were taken on 12 October 2026 from that commit
running on a throwaway database with the demo seed (example year groups were
added to the demo classes for the screenshots only). `email.png` is the
teacher confirmation email rendered from `email.js` with example links, and
`admin-pdf-export.png` is page 1 of the admin PDF export.

Facts about Railway (plans, prices, SMTP, regions, volumes, backups, Railpack
packages) are cited in the document with the date they were checked. Recheck
them before relying on them, and update the document if the code changes.
