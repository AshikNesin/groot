# @groot/jobs

## 0.1.0

### Minor Changes

- [#60](https://github.com/AshikNesin/groot/pull/60) [`0473401`](https://github.com/AshikNesin/groot/commit/0473401aacc5ccd4e67e8def92e98b30ecd72a9a) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Extract all jobs code into a dedicated `@groot/jobs` package

  The entire jobs vertical — pg-boss backend infrastructure, HTTP admin API,
  job logger, the dashboard UI, client types, and API methods — now lives in a
  single `@groot/jobs` package with two flat entry points:

  - `@groot/jobs/backend/*` — pg-boss queue/worker/queries, routes, job logger
  - `@groot/jobs/frontend/*` — dashboard UI, `jobsApi`, types

  Business-specific handlers (`todo.jobs.ts`) and bootstrap wiring stay in
  `apps/web/`. This consolidates jobs code that was previously spread across
  `@groot/server` (`core/job`, `shared/jobs`, `core/logger`), `@groot/client`
  (`types/jobs`, apiClient methods), and `apps/web` (dashboard UI).

  **Breaking — migration required for downstream repos:**

  - `createJobLogger` / `JobLogStream` / `createJobLogStream` moved from
    `@groot/server/core/logger` → `@groot/jobs/backend/logger`. The
    `@groot/server/core/logger` re-exports are removed.
  - The 17 job methods were removed from `apiClient` (`@groot/client/lib/api`).
    Use `jobsApi` from `@groot/jobs/frontend` instead.
  - `JobName` changed from an enum (with hardcoded `TODO_*` values) to
    `type JobName = string`. App-specific job names live with their handlers.
  - Server-side imports of job infra must move from
    `@groot/server/core/job/*` and `@groot/server/shared/jobs/*` to
    `@groot/jobs/backend/*` (use explicit subpaths like `/worker`, `/logger`,
    `/routes` for the server bundle).
  - The jobs dashboard UI moved from `apps/web/src/client/app/jobs/` to
    `@groot/jobs/frontend`. Import pages via `@groot/jobs/frontend`.

  The `database → logger → job-stream → database` module cycle is resolved as
  a side effect (job-stream left `@groot/server/core/logger`). `pg-boss` is no
  longer a dependency of `@groot/server` (it now lives in `@groot/jobs`).

### Patch Changes

- Updated dependencies [[`0473401`](https://github.com/AshikNesin/groot/commit/0473401aacc5ccd4e67e8def92e98b30ecd72a9a)]:
  - @groot/server@0.1.0
  - @groot/client@0.1.0
