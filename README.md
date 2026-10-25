# Actwise

Know what matters. Act on it.

Actwise is my entry for the Hacktoberfest Open-Source AI Challenge, Week 3 (Slow and Steady).

It reads your Chrome bookmarks, uses a small open-weight model running on your own laptop to understand each saved page, and shows at most three things worth acting on. The rest of the pile stays out of the way.

Status: built in one day. It ran end to end once on the author's laptop. It has not been used by anyone else and has not been evaluated with real users.

## The problem

Saving a link feels productive. Going back to it takes effort, so the saved pile only grows and the guilt grows with it. Actwise tries to remove that effort: import once, let it work through the pile slowly in the background, then only tap buttons.

## How it works

1. Export your bookmarks from Chrome (Bookmark manager, three dots, Export bookmarks) and import the file.
2. A slow background worker visits each link, one every couple of seconds, and extracts the readable text.
3. A local model (through Ollama) fills in a strict form: type, summary, why it may matter, requirements, deadline quote, next step, unknowns.
4. Plain code checks the model. The answer must fit the form. A deadline only counts as verified if the quoted sentence really appears on the page and the date in it matches.
5. Plain code scores each item from your goals, verified deadlines, effort and age. The model never decides priority.
6. The Today screen shows the top three with buttons: I will do this, Later (hides 3 days), Drop it. Pages that could not be read are listed under "Needs a quick look".

## What I observed in the first real run

Run on 25 October 2026 on a Windows laptop with 8 GB RAM, using `gemma3:4b` through Ollama. The database held older test items too, so the numbers below are only for the 8 real pages (my 6 fictional demo pages plus the public React and npm Docs sites).

| Page | Result |
|---|---|
| Frontend Intern (demo) | Analysed as a job. Deadline verified (8 Nov 2026). Shown on Today with "14 day(s) left". |
| tiny-ui-kit (demo) | Analysed as a code project, no deadline. Shown on Today. |
| AI Growth Intern "LAST CHANCE" (demo) | Analysed as a job. Deadline state "mentioned", not verified, so it adds no urgency. I did not record whether it appeared in the top three. |
| Summer Code Jam (demo, already closed) | Analysed. Deadline verified, in the past. By design it is hidden from Today (covered by an automated test; I did not check it on screen). |
| Campus Build Sprint (demo) | Analysis timed out at the 4 minute limit. Not analysed. |
| Learn SQL (demo) | Page read failed with `no_readable_text`. Cause not investigated. |
| React, npm Docs (public sites) | Analysed, no deadline. |

Totals for those 8 pages: 7 read, 1 unreadable; 6 analysed, 1 timed out. None of the 6 analyses needed a second attempt. Analysis took between roughly 48 and 96 seconds per page, 68.5 seconds on average (the first one includes loading the model).

Problems I saw in the model's text:
- It wrote that an internship was "potentially leading to a full-time role". The page never says that. The card labels this text as an AI guess, but it is still invented. The scoring code ignores that text.
- Its "next 10 minutes" step for one card was far bigger than 10 minutes.

## Open AI and privacy: what is true

- The model runs locally through Ollama. Page text goes to the model on your machine as long as `OLLAMA_URL` points to your own computer (the default). I did not test the app with the network switched off.
- The background worker visits the links you saved, so those websites can see requests from your laptop.
- Bookmarks and results are stored in a local SQLite file (`server/data/actwise.db`), which Git ignores.
- Actwise's own code sends no analytics. I did not audit Ollama, Node or the npm packages.
- Model weights are not in this repository. Gemma 3 is open-weight under Google's own terms of use, which are not an OSI-approved open-source license. Read the current terms on the model page before redistributing anything.
- Implemented and covered by automated tests (with fake network and fake model): only http/https links, private and local addresses blocked (also after redirects), size limit 1 MB, HTML only, strict output form, deadline verification.

## Known limits

- The server listens on all network interfaces and has no login. On a shared network, another device could reach its API. Planned fix: bind to 127.0.0.1.
- DNS rebinding is not fully closed (the address is checked, then fetched separately).
- The 10 second fetch timeout has no automated test.
- Failed pages are not retried automatically (`scripts/retryFailed.ts` does it by hand).
- A 4B model on 8 GB RAM is slow, timed out once, and sometimes invents or oversizes text.
- Only the first 4000 characters of a page are sent to the model, so a deadline further down looks unknown.
- Goal matching is a plain substring check ("react" also matches "reactive").
- The web screens have no automated tests. The GitHub Actions workflow is included but I have not yet seen it run.
- Scoring weights are a hypothesis. No user study. No measured time saving.
- Only Chrome's HTML export is supported.

## Requirements

- Node 22.13 or newer (uses the built-in `node:sqlite`, which prints an experimental warning)
- Ollama with a model pulled, for example `ollama pull gemma3:4b`
- 8 GB RAM is tight for a 4B model: close other apps while it runs

## Run it

```bash
# terminal 1
cd server
npm install
npm run dev

# terminal 2
cd web
npm install
npm run dev
```

Open http://localhost:5173 and import a bookmarks file.

To try the fictional demo, import `samples/demo-bookmarks.html`. The demo pages live in `docs/demo` and are served by GitHub Pages, because Actwise correctly refuses to read anything on localhost. If you fork this repo, enable Pages for the `/docs` folder and change the base address inside `samples/demo-bookmarks.html`. The save dates in that file are made up.

## Settings (environment variables)

| Name | Default | Meaning |
|---|---|---|
| ACTWISE_MODEL | gemma3:4b | Ollama model to use |
| ACTWISE_GOALS | internship,frontend,react,typescript,hackathon,open source | Words your goals are matched against |
| ACTWISE_WORKER | on | Set to `off` to stop the background reader |
| OLLAMA_URL | http://127.0.0.1:11434 | Where Ollama runs |
| ACTWISE_DB_PATH | server/data/actwise.db | Database file |

Windows cmd example: `set ACTWISE_MODEL=gemma4:e2b&& npm run dev` (I only ran `gemma3:4b`).

## Tests

```bash
cd server
npm test
npm run typecheck
```

On my machine the last run showed 16 test files and 105 tests passing, typecheck clean, and the web build succeeding. Tests use fake models and fake pages, so they need no internet and no Ollama. See `docs/TEST_PLAN.md`.

## Scripts

- `npx tsx scripts/stats.ts` prints counts and the average analysis time (no links or page text)
- `npx tsx scripts/retryFailed.ts [--fetch]` puts failed items back in the queue
- `npx tsx scripts/tryFetch.ts <url>` shows what the safe reader sees on one page

## More

- `ENGINEERING_PLAYBOOK.md`: design, decisions and what is verified
- `docs/TEST_PLAN.md`: automated coverage and the manual check

## License

MIT for the code (see LICENSE). Model licenses are separate.

## Commits after the deadline
None so far. I will list any here.