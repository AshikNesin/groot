---
"@groot/web": patch
---

Model honker job-queue tables in the SQLite Prisma schema to prevent migration drift

The honker SQLite job queue (@russellthehippo/honker-node) creates its own
tables (`_honker_live`, `_honker_dead`, `_honker_locks`,
`_honker_notifications`, `_honker_rate_limits`, `_honker_results`,
`_honker_scheduler_tasks`, `_honker_stream`, `_honker_stream_consumers`) at
runtime inside the app's SQLite file. Because Prisma's migration history didn't
know about them, `prisma migrate dev` detected drift and wanted to drop all nine
tables — breaking migration creation against any database honker had touched.

This mirrors how the `keyv` table is already handled: the tables are declared in
a new migration (`20260316000000_honker_tables`, guarded with
`IF NOT EXISTS` so it's a no-op when honker already bootstrapped them) and
added as `@@ignore`-d models in `schema.sqlite.prisma` so Prisma neither owns
nor generates DDL for them. Defaults like `created_at DEFAULT (unixepoch())`
are expressed via `@default(dbgenerated(...))`, and index names are pinned with
`@@index(..., map: ...)` so drift detection stays quiet. The three partial
(`WHERE`-predicate) indexes honker uses on `_honker_live` aren't expressible in
Prisma syntax and live only in the migration SQL.

- Verified end-to-end: `prisma migrate dev --create-only` now emits an empty
  migration (zero drift) after honker initializes its tables.
- No postgres migration needed: postgres uses pg-boss, which keeps its tables
  in a separate schema and never drifts.
- Updated the schema-parity test to ignore `@@ignore`-d infrastructure models,
  since honker's tables are SQLite-only and intentionally absent from the
  postgres schema.
