---
"groot": minor
---

## Build: copy `server/public/` → `dist/public/`

`scripts/build.mjs` now copies `server/public/**` into `dist/public/**` after
the esbuild step, so static assets (favicons, app icons, OG images, etc.) ship
with the production bundle and can be served via `express.static(distPath)`.
The copy is opt-in — a no-op when `server/public/` doesn't exist — so existing
projects are unaffected.

## Sync: the tool now keeps itself up to date

Added `.groot/**` and `.agents/skills/groot-sync/**` to `SYNC_PATTERNS` in both
`sync.ts` and `upstream.ts`, so improvements to the sync tooling (checkout
reuse, report-format changes, categorization rules) flow through `groot:sync`
automatically instead of requiring a hand-copy into every child repo.

Per-project state and project-only docs are guarded by `IMMUTABLE_EXCLUSIONS`
so they are never overwritten with the boilerplate's own values:

- `.groot/boilerplate-sync.json` (last_sync baseline)
- `.groot/sync-report.json`
- `.groot/feature-request.md`
- `.groot/repo-drift.md`

Only the tool's _code_ syncs; the load-bearing state files are preserved.
