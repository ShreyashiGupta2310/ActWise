# Test plan

## Automated (server): `npm test` and `npm run typecheck`

Observed on the author's machine: 16 test files, 105 tests passed, typecheck clean. Web: `npm run build` succeeded.

Covered with fake network and fake model:
- URL cleaning, bookmark parsing, import and duplicates
- Safe fetching: blocked addresses, redirects, size and type limits
- Page text extraction
- Model client: unreachable, missing, errors
- Analysis: valid answer, code fence, one retry, invalid shape, made-up deadline
- Deadline verification: real quote, made-up quote, ambiguous date, two dates
- Scoring: goal matching, urgency table, expiry, age
- Today list: ranking, hiding, snoozing, corrupted rows
- API: import, list, status, today, actions, error shapes
- Worker: page failures, model unavailable, crashes

Not automated: the 10 second fetch timeout, the real model, the web screens.

## Manual end-to-end check

Run on 25 October 2026, gemma3:4b, 8 GB laptop.

| Step | Result |
|---|---|
| Import samples/demo-bookmarks.html | Done. Imported as new items. |
| Wait for analysis | Done. 6 analysed, 1 timed out, 1 page unreadable. |
| Today shows Frontend Intern with confirmed deadline | Observed (screenshot): "Deadline 2026-11-08, 14 day(s) left". |
| Today shows tiny-ui-kit | Observed (screenshot). |
| Hype page gets no urgency | Deadline state "mentioned" (from stats). Not checked on screen. |
| Expired Summer Code Jam is hidden | Not checked on screen. |
| Tap Later / Drop and reload | Not yet performed. |
| Stop Ollama, import, banner appears, restart Ollama | Not yet performed. |
| Stop server mid-run, restart, work continues | Not yet performed. |
| Import a file with no links, red message | Observed on an earlier slice (before the worker existed). |
| Run `npx tsx scripts/stats.ts` | Done. See the playbook. |