# Database engines: SQLite (default) and PostgreSQL

This branch (`feat/sqlite-migration`) makes the app run on **either** SQLite or
PostgreSQL, selected by the `DATABASE_ENGINE` env var. SQLite is the default
(zero-infra local dev); set `DATABASE_ENGINE=postgres` to opt into Postgres.

The job queue (pg-boss) is Postgres-only and is auto-disabled when the engine
is SQLite (see [Jobs](#jobs-pg-boss)).

## Quick start

```bash
# Default: SQLite. DB lives in ./data/dev.db (auto-created).
pnpm dev

# Opt into Postgres. Uses the local Docker container (or DATABASE_URL).
DATABASE_ENGINE=postgres pnpm dev

# Tests: same switch. SQLite → ./tmp/test.db, Postgres → isolated *_test DB.
pnpm test
DATABASE_ENGINE=postgres pnpm test
```

## How the engine is selected

`DATABASE_ENGINE` (default `sqlite`, values: `sqlite` | `postgres`) is read once
in `packages/core/src/database/engine.ts`, which exports `dbEngine`,
`isPostgres`, `isSqlite`. Every engine-aware module routes through these:

| Module                                        | What branches                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `prisma.config.ts`                            | picks `schema.{engine}.prisma` + `migrations-{engine}/`                      |
| `packages/core/src/database/client.ts`        | `PrismaBetterSqlite3` vs `PrismaPg` (+ `pg.Pool`)                            |
| `packages/core/src/kv/store.ts`               | `@keyv/sqlite` vs `@keyv/postgres`                                           |
| `apps/web/src/server/index.ts`                | skips `initJobQueue()` when SQLite                                           |
| `scripts/dev.ts`, `scripts/ensure-test-db.ts` | mkdir+migrate (SQLite) vs Docker container+migrate (Postgres)                |
| `tests/server/_db-guard.ts`                   | path-under-`tmp/` check (SQLite) vs `localhost`+`_test` URL check (Postgres) |
| `tests/e2e/global-setup.ts`                   | picks the adapter for the seed client                                        |
| `scripts/db-sync-baseline.cjs`                | picks schema + migrations paths                                              |

## The key design choice: one shared schema with `Json` columns

The two schema files (`apps/web/prisma/schema.sqlite.prisma`,
`apps/web/prisma/schema.postgres.prisma`) define **identical models** — only
`datasource.provider` differs. A parity test
(`tests/server/prisma/schema-parity.test.ts`) asserts the model sections match
byte-for-byte, so they can't drift.

This works because we use Prisma's `Json` type for the fields that used to be
engine-specific:

- `Passkey.transports` — was `String[] @db.VarChar` (Postgres array); now `Json`
  on both engines. SQLite stores it as `JSONB`-declared `TEXT` (Prisma
  (de)serialises); Postgres stores native `JSONB`. The generated client types it
  as `Prisma.JsonValue` on **both** engines, so passkey code is identical.
- `JobLog.data` — was `Json? @db.Json`; now `Json?` on both engines.

`Json` is the unifying primitive: it round-trips JS arrays/objects natively and
produces type-identical generated clients regardless of engine. That means
**application code never branches on the engine** — the only branch points are
the infrastructure modules listed above.

All `@db.*` annotations (`@db.VarChar`, `@db.Text`, `@db.Timestamptz(6)`,
`@db.Json`, `@db.VarChar[]`) were dropped: they're Postgres-specific, ignored by
SQLite, and unnecessary. `DATABASE_URL_DIRECT` (pooler bypass) is still honoured
for Postgres but ignored for SQLite.

## DATABASE_URL shape

`DATABASE_URL` is resolved by varlock from `.env.schema`, branching on engine
_and_ `NODE_ENV`:

| Engine   | dev                                                             | test                                   | production                          |
| -------- | --------------------------------------------------------------- | -------------------------------------- | ----------------------------------- |
| sqlite   | `file:./data/dev.db`                                            | `file:./tmp/test.db`                   | operator sets an absolute file path |
| postgres | local Docker URL (`scripts/get-local-db-connection-string.cjs`) | isolated `*_test` DB in same container | operator sets a Postgres URL        |

`resolveSqlitePath(url)` (exported from `packages/core/src/database/client.ts`)
handles the `file:` prefix, relative-path resolution, and parent-dir creation
for SQLite. The KV store normalises the same value into a `sqlite://<path>` URI
for `@keyv/sqlite`.

## Migrations

Two independent migration histories, one per engine:

- `apps/web/prisma/migrations-sqlite/` — `migration_lock.toml` = `sqlite`
- `apps/web/prisma/migrations-postgres/` — `migration_lock.toml` = `postgresql`

`prisma.config.ts` points `migrations.path` at the right one, so the standard
scripts work without engine flags:

```bash
pnpm db:migrate          # prisma migrate deploy (uses active engine)
pnpm db:migrate:create   # prisma migrate dev --create-only
pnpm db:migrate:reset    # prisma migrate reset
```

**To create a migration, switch to the engine you want it for first** (set
`DATABASE_ENGINE`), because `migrate dev` connects to a real DB. Every schema
change needs a migration in _both_ histories — generate one per engine.

## Raw SQL: use the `$queryRaw` tagged template

The passkey challenge store runs a `DELETE ... RETURNING` that must work on both
engines. Use Prisma's `$queryRaw\`...\``tagged template (not`$queryRawUnsafe` with literal placeholders) so Prisma emits the correct
placeholder syntax per engine (`?`for SQLite,`$1` for Postgres):

```ts
const result = await prisma.$queryRaw<{ value: string }[]>`
  DELETE FROM keyv WHERE key = ${challengeKey} RETURNING value
`;
```

`RETURNING` on `DELETE` requires SQLite ≥ 3.35 (2021); Node 24 and
`better-sqlite3` both ship modern SQLite, so this is safe.

## Jobs (pg-boss)

pg-boss is Postgres-only (its schema, `LISTEN/NOTIFY`, `SELECT FOR UPDATE SKIP
LOCKED`, etc.). Rather than migrate it, the server auto-disables the job queue
when `DATABASE_ENGINE=sqlite`:

```ts
const jobsEnabled = config.jobs.enabled && isPostgres;
```

- `packages/jobs/**` and `apps/web/src/server/api/todo/todo.jobs.ts` are left
  untouched and still import `pg-boss`.
- On SQLite, `initJobQueue()` is never called; the server logs that jobs are
  disabled and stays up. All non-job API routes work normally.
- `JobLog` stays in the schema (as `Json?` for `data`) so `prisma.jobLog` code
  compiles on both engines; on SQLite nothing writes `JobLog` rows because no
  handlers run.
- There is one **pre-existing** TypeScript error in
  `packages/jobs/src/server/client.ts` (the `PgBoss` constructor overload with
  `idleTimeoutMillis`). It exists on `main` too and is unrelated to this change.

To finish the jobs story later, either swap pg-boss for a SQLite-compatible
queue, or keep pg-boss behind a separate Postgres connection just for the queue
(requires `DATABASE_ENGINE=postgres`).

## Packages

`@groot/core` keeps **both** adapter sets installed (dual-engine support):

- `@prisma/adapter-better-sqlite3` + `better-sqlite3` (SQLite)
- `@prisma/adapter-pg` + `pg` (Postgres)
- `@keyv/sqlite` (KV, SQLite; uses the async `sqlite3` native driver)
- `@keyv/postgres` (KV, Postgres)

`better-sqlite3` and `sqlite3` are native modules listed in
`onlyBuiltDependencies` in `pnpm-workspace.yaml` so their build scripts run.

> ⚠️ Supply-chain note: the repo's `trustPolicy: no-downgrade` in
> `pnpm-workspace.yaml` blocks installs when a transitive `semver@6.3.1` (pulled
> by the already-present `shadcn`/`@sentry/*`) trips a trust-downgrade check on
> tree re-resolution. Adding packages required
> `--config.trustPolicy=none` to get past that. Pre-existing repo condition.

## Verification

- `pnpm check` (oxlint + oxfmt): 0 errors.
- `tsc --noEmit`: 1 error — the pre-existing pg-boss overload issue in
  `packages/jobs/src/server/client.ts`. No new errors.
- `pnpm test` (vitest, 12 files / 129 tests): **all pass**, including the
  schema-parity test and the KV test (loads the `sqlite3` native binding).
- `pnpm build`: succeeds.
- **SQLite runtime smoke test** (`file:./tmp/smoke.db`): `prisma migrate deploy`
  - `db seed`, then `POST /api/v1/auth/login` (JWT), `GET/POST /api/v1/todos`,
    and `POST /api/v1/passkey/register/options` (writes a challenge to the `keyv`
    table via `@keyv/sqlite`) all pass. Confirmed `transports JSONB` and
    `data JSONB` columns in the SQLite file.
- **Postgres client parity**: `DATABASE_ENGINE=postgres prisma generate`
  produces a client with identical `runtime.JsonValue` types for `transports`
  and `data` — confirming the generated client is type-identical across engines.

## Gotchas

1. **`provider` is static per schema file** — Prisma can't parametrise it, hence
   two schema files. `prisma.config.ts` picks one by engine.
2. **Prisma 7 forbids `url` in `schema.prisma`** — the connection URL lives in
   `prisma.config.ts` (`datasource.url`).
3. **`prisma migrate diff` flag rename in Prisma 7**: `--to-schema-datamodel`
   is now `--to-schema`.
4. **Two native SQLite drivers coexist**: `better-sqlite3` (sync, Prisma) and
   `sqlite3` (async, `@keyv/sqlite`). Both must be built. They open independent
   connections to the same file — fine for SQLite's locking model.
5. **Dev server does not auto-migrate.** `scripts/dev.ts` runs `migrate deploy`
   before starting the server, but starting the server directly
   (`tsx apps/web/src/server/index.ts`) against a non-existent SQLite file opens
   an empty file and every query fails with `Database table does not exist`.
   Run `pnpm db:migrate` first (or `pnpm dev`).
6. **Concurrent writers (SQLite)**: SQLite serialises writes. For a
   single-process app this is a non-issue; for multi-process deploys enable WAL
   mode and expect `SQLITE_BUSY` retries. `@keyv/sqlite` sets `busyTimeout`;
   the Prisma adapter doesn't set a `busy_timeout`, so heavy concurrent writes
   could surface `SQLITE_BUSY`. Not a concern for the single-process boilerplate.
7. **Switching engines locally requires `pnpm prisma:generate`** — the
   generator output path is shared. With unified `Json` types this swaps the
   query engine only, not the TypeScript types, so it's clean.
8. **Every schema change needs two migrations** (one per engine). The parity
   test catches model drift but not migration drift — remember to generate for
   both.
