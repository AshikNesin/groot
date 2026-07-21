# @groot/jobs

## 0.7.0

### Minor Changes

- [#84](https://github.com/AshikNesin/groot/pull/84) [`a9b3825`](https://github.com/AshikNesin/groot/commit/a9b3825a930988d6fcbe9e7f0e53cc8fce5b470e) Thanks [@exe-dev-github-integration](https://github.com/apps/exe-dev-github-integration)! - Redesign jobs UI for consistency and add loading skeletons

  The jobs pages used a bespoke layout that diverged from the rest of the app:
  a small custom header, heavy `border-dashed` styling on stat cards / tables /
  detail blocks, and inconsistent button sizing. They now match the app's
  established design language:

  - Jobs and JobDetail use the shared `PageLayout` / `PageContainer` for a
    consistent header (title + description + actions) and spacing.
  - Stat cards are now a single compact clickable Card row (dub-inspired) instead
    of seven dashed-border boxes.
  - The jobs table and scheduled-jobs panel are wrapped in Cards with clean
    rounded borders; detail sections (Overview, Data, Output, Logs, Singleton,
    Error) use Card + CardHeader/CardTitle.
  - Actions, filter controls, and dialog triggers use the standard Button size
    scale and `size-*` icons.

  Loading states are now proper skeletons that match the loaded layout instead
  of a centered spinner or a sudden layout jump:

  - A reusable `skeletons.tsx` module (`JobsStatsSkeleton`, `JobsTableSkeleton` /
    `JobRowSkeleton`, `ScheduledJobsSkeleton`, `JobDetailSkeleton`) shares the
    shapes across every loading surface so they stay in sync with the real
    components.
  - Stats, the jobs table, scheduled jobs, and the job detail page all render
    their skeleton while their data loads.

## 0.6.2

### Patch Changes

- [`b0a391b`](https://github.com/AshikNesin/groot/commit/b0a391b85274ab8cf2f6837b8dda4dadf6f716a1) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Improve form field spacing and consistency

  The shared `form.tsx` primitives now apply more consistent spacing
  between fields. Updated the job dialogs (Add/Edit/Schedule) and
  AppSettings form to use the improved form components for uniform
  vertical rhythm across forms.

- [`b0a391b`](https://github.com/AshikNesin/groot/commit/b0a391b85274ab8cf2f6837b8dda4dadf6f716a1) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Truncate job IDs in the jobs list and toasts

  Job IDs are now shown truncated to 6 characters in the jobs list, and
  the same `formatJobId` helper is reused for job IDs in toasts so the
  short form is consistent everywhere a job is referenced.

- Updated dependencies [[`b0a391b`](https://github.com/AshikNesin/groot/commit/b0a391b85274ab8cf2f6837b8dda4dadf6f716a1), [`b0a391b`](https://github.com/AshikNesin/groot/commit/b0a391b85274ab8cf2f6837b8dda4dadf6f716a1), [`b0a391b`](https://github.com/AshikNesin/groot/commit/b0a391b85274ab8cf2f6837b8dda4dadf6f716a1)]:
  - @groot/ui@0.2.1
  - @groot/shell@0.5.0
  - @groot/core@0.7.1

## 0.6.1

### Patch Changes

- [`986c902`](https://github.com/AshikNesin/groot/commit/986c9024f0f5a106a4a8822b96605c8ef9eee225) Thanks [@AshikNesin](https://github.com/AshikNesin)! - fix(jobs): completed jobs and job types not visible on SQLite (honker)

  Two bugs in the honker (SQLite) adapter made the jobs dashboard lose parity
  with the Postgres (pg-boss) engine:

  1. **Completed jobs vanished.** `job.ack()` calls honker's `honker_ack()`,
     which DELETEs the row from `_honker_live`. pg-boss keeps completed jobs with
     `state='completed'` so the dashboard can list them. The adapter now marks
     the job `state='done'` in-place via SQL UPDATE (with a `worker_id` + claim
     guard to avoid races) instead of deleting it.

  2. **Completed/expired/cancelled state filters returned nothing.** The state
     filter queries had inline ternaries mapping `created`→`pending` and
     `active`→`processing`, but were missing `completed`→`done` (and
     `failed`→`dead`). Even if completed jobs existed, `WHERE state='completed'`
     matched nothing. Extracted a proper `toHonkerState()` reverse-mapping used
     by `getJobsByState`, `getJobs`, and `purgeJobsByState`.

  3. **"Add Job" dropdown was empty.** `getAvailableQueues()` only returns queues
     with rows currently in `_honker_live`. On a fresh database (or after
     purging), no job types appeared even though handlers were registered.
     `queries.getAvailableQueues()` now returns the union of adapter queues and
     registered handlers (`getRegisteredHandlers()`), which is the source of
     truth for triggerable job types.

## 0.6.0

### Minor Changes

- [#77](https://github.com/AshikNesin/groot/pull/77) [`e0d78f5`](https://github.com/AshikNesin/groot/commit/e0d78f5d17c27df512cd53ec20277ffdc9cf19bb) Thanks [@exe-dev-github-integration](https://github.com/apps/exe-dev-github-integration)! - feat: dual database engines (SQLite default, PostgreSQL opt-in) + job-queue adapter

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

### Patch Changes

- Updated dependencies [[`e0d78f5`](https://github.com/AshikNesin/groot/commit/e0d78f5d17c27df512cd53ec20277ffdc9cf19bb)]:
  - @groot/core@0.7.0

## 0.5.2

### Patch Changes

- [#73](https://github.com/AshikNesin/groot/pull/73) [`40eb1ec`](https://github.com/AshikNesin/groot/commit/40eb1ece15b0b3c299b32f12763f2c7be4ff25d0) Thanks [@exe-dev-github-integration](https://github.com/apps/exe-dev-github-integration)! - perf: reduce memory and connection overhead in job queue

  - **PgBoss connection pool**: explicitly capped at `max=3` connections (`idleTimeoutMillis=30s`, `connectionTimeoutMillis=5s`). Previously used pg's default of `max=10`, creating up to 10 idle connections for background-job polling that needs at most 2-3.
  - **Job logger**: reuse a single module-level `pino-pretty` stream instance across all job executions instead of allocating a new `Transform` + `SonicBoom` writer on every job run.

- Updated dependencies [[`40eb1ec`](https://github.com/AshikNesin/groot/commit/40eb1ece15b0b3c299b32f12763f2c7be4ff25d0), [`1e85141`](https://github.com/AshikNesin/groot/commit/1e851410f1b5cdce9a6bcafd269da4f091c99245), [`225280b`](https://github.com/AshikNesin/groot/commit/225280b0899784e6fd92a363adb141dc7647bd24)]:
  - @groot/core@0.6.1
  - @groot/shell@0.4.0

## 0.5.1

### Patch Changes

- Updated dependencies [[`86c1657`](https://github.com/AshikNesin/groot/commit/86c165721799f81f001ea8f3c986ffc984551b4e)]:
  - @groot/core@0.6.0

## 0.5.0

### Minor Changes

- [#69](https://github.com/AshikNesin/groot/pull/69) [`0c47508`](https://github.com/AshikNesin/groot/commit/0c47508c31623b46f051257048c19f7c86c89e2b) Thanks [@AshikNesin](https://github.com/AshikNesin)! - refactor(core): migrate backend validation from middleware to strictly-typed controller helpers

  Replaced the `validateBody`, `validateQuery`, and `validateParams` Express middlewares with inline controller helpers `parseBody`, `parseQuery`, and `parseParams`. This change improves type safety by directly leveraging `z.output<typeof Schema>` inside the controllers, eliminating the need for unsafe `as T` casting.

  - The `req.validated` property has been removed from the Express Request type.
  - All core and shared feature modules (auth, passkey, storage, jobs, settings) have been migrated.

### Patch Changes

- Updated dependencies [[`0c47508`](https://github.com/AshikNesin/groot/commit/0c47508c31623b46f051257048c19f7c86c89e2b)]:
  - @groot/core@0.5.0

## 0.4.1

### Patch Changes

- [`5f9eddd`](https://github.com/AshikNesin/groot/commit/5f9eddd7bba05222c378578a7d0900dac53d52a2) Thanks [@AshikNesin](https://github.com/AshikNesin)! - refactor: unify cross-package imports on @groot/\* aliases

  Standardizes import style so cross-directory imports always use the
  package alias (`@groot/core/*`, `@groot/shell/*`, `@groot/jobs/*`) while
  same-directory imports stay relative (`./`). Previously these were mixed —
  even within a single file (e.g. `../kv` next to `@groot/core/logger`) —
  making import style inconsistent across the codebase.

  ## @groot/core

  - Converted all cross-directory `../` imports to `@groot/core/*` aliases
    across `ai`, `auth`, `config`, `kv`, `middlewares`, `notification`,
    `passkey`, `settings`, `storage`, and `utils`.
  - Same-directory `./` imports left unchanged.
  - Prisma `../../generated/prisma/client` imports in `database/` kept
    relative (no alias maps to the generated output outside `src/`).

  ## @groot/shell

  - Converted cross-directory `../` imports to `@groot/shell/*` aliases
    across `components`, `hooks`, `lib`, `pages/storage`, `services`, and
    `store`.

  ## @groot/jobs

  - Converted cross-directory `../` imports to `@groot/jobs/client/*`
    aliases across the client `components/`.

- Updated dependencies [[`5f9eddd`](https://github.com/AshikNesin/groot/commit/5f9eddd7bba05222c378578a7d0900dac53d52a2)]:
  - @groot/core@0.4.1
  - @groot/shell@0.3.1

## 0.4.0

### Minor Changes

- [`83b3a6f`](https://github.com/AshikNesin/groot/commit/83b3a6f1ce34a28299b00f18645faabf3e9569a8) Thanks [@AshikNesin](https://github.com/AshikNesin)! - refactor: unify API client, form handling, and server response flow

  A cross-cutting refactor of how the frontend talks to the API and how
  controllers shape responses, plus a shared Form primitive.

  ## @groot/core

  - Removed the `*System` namespace barrels (`AISystem`, `AuthSystem`,
    `ErrorSystem`, `KVSystem`, plus the passkey/settings/storage equivalents).
    Callers now use direct named imports instead of convenience namespaces.
  - Added `utils/controller.utils.ts` with `requireUser(req)` and
    `validatedBody<T>(req)` helpers, replacing repeated inline `req.user` /
    `req.body as` boilerplate across controllers.
  - Added `utils/api-response.utils.ts` to standardize controller response
    shapes.
  - Extracted shared Zod field shapes (`emailField`, `passwordField`) in
    `auth.validation.ts` so the client can reuse them for form validation
    (single source of truth).
  - Streamlined `error-handler`, `error-response`, `route-handler`, and
    `validation` middlewares.

  ## @groot/ui

  - Added a `Form` component (`form.tsx`) with `react-hook-form` integration and
    field helpers.

  ## @groot/shell

  - Reworked `lib/api.ts` (the `apiClient`) for simpler, more consistent request
    handling.
  - Added `useToastMutation` hook to standardize mutation + toast feedback.
  - Refactored `Login`, storage dialogs (`CreateFolderDialog`, `RenameDialog`),
    `PasskeyManager`, `AppSettings`, and the `useStorage` / `useAppSettings`
    hooks to build on the new Form component and apiClient.

  ## @groot/jobs

  - Refactored the client API layer (`api.ts`), `useJobs`, `useJobDetail`, and
    `JobsTable` to align with the new apiClient patterns.

### Patch Changes

- Updated dependencies [[`83b3a6f`](https://github.com/AshikNesin/groot/commit/83b3a6f1ce34a28299b00f18645faabf3e9569a8)]:
  - @groot/core@0.4.0
  - @groot/ui@0.2.0
  - @groot/shell@0.3.0

## 0.3.0

### Minor Changes

- [#64](https://github.com/AshikNesin/groot/pull/64) [`ae54b49`](https://github.com/AshikNesin/groot/commit/ae54b4920f39b2dbd9432298855210cb4752cd57) Thanks [@AshikNesin](https://github.com/AshikNesin)! - refactor: reorganize codebase architecture

  - Flattened the `packages/` directory, merging `server`, `logger`, and `database` into `core`.
  - Renamed `client` to `shell`.
  - Moved boilerplate `auth`, `settings`, and `storage` modules out of `apps/web/src/client/pages` and into `@groot/shell`.
  - Replaced all legacy paths with their new equivalents in all codebase documentation, tests, and comments.

### Patch Changes

- Updated dependencies [[`ae54b49`](https://github.com/AshikNesin/groot/commit/ae54b4920f39b2dbd9432298855210cb4752cd57)]:
  - @groot/core@0.3.0
  - @groot/shell@0.2.0
  - @groot/ui@0.1.0

## 0.2.0

### Minor Changes

- [`07de4af`](https://github.com/AshikNesin/groot/commit/07de4afce92948ac8a657284548d21fb7a670910) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Extract logger into a dedicated `@groot/core/logger` package

  The Pino logger module moves out of `@groot/core/core/logger/` into its own
  flat `@groot/core/logger` package (mirrors `@groot/core/database` as a leaf). This removes
  the `@groot/jobs` → `@groot/core` reach-through for logger exports and gives
  foundational infrastructure its own package boundary.

  **Breaking — migration required for downstream repos:**

  - All `@groot/core/core/logger` imports must move to `@groot/core/logger`. Affected
    surfaces: server middlewares, kv store, shared services, the jobs backend,
    the app bootstrap, and tests that `vi.mock` the logger.
  - The logger no longer reads `env`/`config` eagerly. The server bootstrap must
    call `configureLogger({ level, service, nodeEnv })` once before request
    handling — `apps/web/src/server/index.ts` now does this as the first statement
    in `main()`:
    ```ts
    import { configureLogger } from "@groot/core/logger";
    configureLogger({
      level: config.logging.level,
      service: config.app.name,
      nodeEnv: env.NODE_ENV,
    });
    ```
    This preserves the `config.logging.level` / `config.app.name` YAML knobs.
  - `loggerConfig` / `logLevel` are now live bindings updated by `configureLogger`
    (read them at runtime, not import time). `isDevelopment` reads `process.env.NODE_ENV`
    directly (equivalent to the previous `env.NODE_ENV`).

  Notes:

  - `@groot/core/logger` is a leaf (deps: `pino`, `pino-pretty`, `dayjs`; `@types/express`/`@types/node` dev). No `@groot/*` deps.
  - `@groot/core`, `@groot/jobs`, and `apps/web` now declare `@groot/core/logger` as a workspace dependency.
  - `@groot/core` no longer contains the logger module; the `packages/core/src/logger/` directory is removed.
  - Configured via the esbuild/vitest/tsconfig `@groot/core/logger` alias.

### Patch Changes

- Updated dependencies [[`07de4af`](https://github.com/AshikNesin/groot/commit/07de4afce92948ac8a657284548d21fb7a670910)]:
  - @groot/core@0.2.0
  - @groot/core/logger@0.1.0

## 0.1.0

### Minor Changes

- [#60](https://github.com/AshikNesin/groot/pull/60) [`0473401`](https://github.com/AshikNesin/groot/commit/0473401aacc5ccd4e67e8def92e98b30ecd72a9a) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Extract all jobs code into a dedicated `@groot/jobs` package

  The entire jobs vertical — pg-boss backend infrastructure, HTTP admin API,
  job logger, the dashboard UI, client types, and API methods — now lives in a
  single `@groot/jobs` package with two flat entry points:

  - `@groot/jobs/server/*` — pg-boss queue/worker/queries, routes, job logger
  - `@groot/jobs/client/*` — dashboard UI, `jobsApi`, types

  Business-specific handlers (`todo.jobs.ts`) and bootstrap wiring stay in
  `apps/web/`. This consolidates jobs code that was previously spread across
  `@groot/core` (`core/job`, `shared/jobs`, `core/logger`), `@groot/shell`
  (`types/jobs`, apiClient methods), and `apps/web` (dashboard UI).

  **Breaking — migration required for downstream repos:**

  - `createJobLogger` / `JobLogStream` / `createJobLogStream` moved from
    `@groot/core/core/logger` → `@groot/jobs/server/logger`. The
    `@groot/core/core/logger` re-exports are removed.
  - The 17 job methods were removed from `apiClient` (`@groot/shell/lib/api`).
    Use `jobsApi` from `@groot/jobs/client` instead.
  - `JobName` changed from an enum (with hardcoded `TODO_*` values) to
    `type JobName = string`. App-specific job names live with their handlers.
  - Server-side imports of job infra must move from
    `@groot/core/core/job/*` and `@groot/core/shared/jobs/*` to
    `@groot/jobs/server/*` (use explicit subpaths like `/worker`, `/logger`,
    `/routes` for the server bundle).
  - The jobs dashboard UI moved from `apps/web/src/client/pages/jobs/` to
    `@groot/jobs/client`. Import pages via `@groot/jobs/client`.

  The `database → logger → job-stream → database` module cycle is resolved as
  a side effect (job-stream left `@groot/core/core/logger`). `pg-boss` is no
  longer a dependency of `@groot/core` (it now lives in `@groot/jobs`).

### Patch Changes

- Updated dependencies [[`0473401`](https://github.com/AshikNesin/groot/commit/0473401aacc5ccd4e67e8def92e98b30ecd72a9a)]:
  - @groot/core@0.1.0
  - @groot/shell@0.1.0
