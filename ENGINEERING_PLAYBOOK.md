# Actwise Engineering Playbook

A living document. Anything marked (planned) is not built yet.

## A. Problem and goals
- Problem: saved bookmarks never get revisited, because going back to them costs mental and typing effort. Saving just delays the guilt.
- Hypothesis (untested): a short, tap-only "Today" list, each item with a clear reason and one small next step, is easier to act on than a saved link.
- MVP: import Chrome bookmarks, analyze them slowly with a local open model, score them with plain code, show at most 3 items on a Today screen.
- Non-goals: browser extension, LinkedIn scraping, auto-apply, accounts, cloud hosting.

## B. Architecture
Web app (React) -> Server (Express) -> SQLite (node:sqlite).
- Built: bookmark parser, URL cleaner, importer, items repo, import and list endpoints, import screen.
- Planned: safe page fetching, background worker, Ollama analysis, priority scoring, Today screen.

## C. Data ownership
- From the Chrome file: url, title, folder path, saved date.
- From the web (planned): page text, untrusted.
- From the model (planned): type, summary, next step. A guess, always validated.
- From our code (planned): priority score.
- From the user (planned): status.

## F. Decisions
1. Chrome export file, not Chrome's internal file. Reading the internal file depends on install paths and file locks, which is risky for a short build. Revisit if the export step annoys users.
2. Node's built-in node:sqlite, not better-sqlite3. better-sqlite3 crashed on load on the author's Windows laptop (Node 22.13.0, exit code -1073741819). node:sqlite needs no install. Trade-offs: an "experimental" warning, needs Node 22.13 or newer, transactions written by hand. Revisit if the node:sqlite API changes.
3. Upload as raw text, not multipart. A bookmarks file is just text, so no extra library is needed. Size limit 10 MB.
4. Duplicates: compare cleaned URLs (no tracking parameters, fragment or trailing slash). The first copy wins. A UNIQUE rule in the database is the backstop.
5. Priority by plain code, not by the model (planned). The model is guessing; scoring must be explainable and testable.

## G. Testing
Tests use Vitest and Supertest with an in-memory database, so no model or real data is needed. As observed by the author at commit 49776b5: 4 test files, 18 tests passed, typecheck clean.

## K. Implementation log
- Slice 1: skeleton, health check, verified by hand.
- Slice 2: parser, URL cleaner, database, import and list endpoints. Bug: better-sqlite3 crashed the test worker on Windows. Proved by running it alone outside Vitest. Fix: switched to node:sqlite.
- Slice 3: import screen (commit pending verification).