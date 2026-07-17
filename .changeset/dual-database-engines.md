---
"@groot/core": minor
"@groot/jobs": minor
"groot": minor
---

feat: dual database engines (SQLite default, PostgreSQL opt-in) + job-queue adapter

The boilerplate now runs on **SQLite by default** and **PostgreSQL as an opt-in**
via `DATABASE_ENGINE`, with the background job queue running on a matching
engine-specific adapter. Application code is engine-agnostic.

## @groot/core

- **Engine selection.** `DATABASE_ENGINE=sqlite` (default) uses
  [better-sqlite3](https://github.com/WiseLibs/better-sqlite3);
  `DATABASE_ENGINE=postgres` uses PostgreSQL via `@prisma/adapter-pg`. The
  driver adapter, the KV backend, and the job queue are all selected by this
  single switch.
- **Two Prisma schemas kept in parity.** `apps/web/prisma/schema.sqlite.prisma`
  and `apps/web/prisma/schema.postgres.prisma` (Prisma requires a literal
  `provider`). A unit test (`tests/server/prisma/schema-parity.test.ts`)
  guards that the two stay in sync.
- **`Json` columns on both engines.** Array/JSON fields use Prisma's `Json`
  type — native `JSONB` on Postgres, `TEXT` on SQLite — so the generated client
  types are identical (`runtime.JsonValue`) and there is zero app-code
  branching.
- **KV backend follows the engine.** Keyv now uses `@keyv/sqlite` on SQLite
  and `@keyv/postgres` on Postgres (was Postgres-only).
- **Generated client is engine-specific.** The generated Prisma client embeds
  the datasource provider, so switching engines requires regenerating it.
  `pnpm dev` / `pnpm test` (via the `pretest` hook) now regenerate for the
  active engine.

## @groot/jobs

- **Job-queue adapter pattern.** A new `JobQueueAdapter` interface
  (`packages/jobs/src/server/adapter.ts`) captures the operations the rest of
  `@groot/jobs` needs. `client.ts` picks the implementation by engine:
  - **Postgres** → `PgBossAdapter` wraps [pg-boss](https://github.com/timgit/pg-boss).
  - **SQLite** → `HonkerAdapter` wraps
    [`@russellthehippo/honker-node`](https://github.com/russellromney/honker), a
    durable SQLite-backed queue with retries, visibility timeouts, dead-letter
    rows, and cron scheduling.
- **Normalized job shape.** Both adapters return jobs in a shared `QueueJob`
  shape; feature handlers take a `JobContext<T>`. No `pg-boss` import remains in
  app code, and the dashboard is engine-agnostic.
- New dependency: `@russellthehippo/honker-node` (SQLite engine only).

## groot (app)

- **SQLite is the default engine.** `DATABASE_ENGINE` defaults to `sqlite`;
  set `DATABASE_ENGINE=postgres` to opt into PostgreSQL.
- **Dual-engine CI.** `.github/workflows/test.yml` runs the full suite
  (typecheck, lint, test, build) on both engines via a matrix — Postgres leg
  uses a `pgvector/pgvector:pg18` service container. Convenience scripts:
  `pnpm test:sqlite`, `pnpm test:postgres`, `pnpm test:all`.
- **Build.** Native modules (`better-sqlite3`, `sqlite3`, `pg`,
  `@russellthehippo/honker-node` + platform packages) are externalized in
  `scripts/build.mjs`.
- **Docs.** New `docs/database-engines.md`; setup, quick-start, architecture,
  jobs, KV, testing, and migration guides updated for both engines.

See `docs/database-engines.md` for the full engine matrix, the `Json` parity
strategy, honker specifics, and migration/build gotchas.
