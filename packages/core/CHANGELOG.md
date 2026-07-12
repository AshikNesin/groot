# @groot/server

## 0.2.0

### Minor Changes

- [`07de4af`](https://github.com/AshikNesin/groot/commit/07de4afce92948ac8a657284548d21fb7a670910) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Extract logger into a dedicated `@groot/logger` package

  The Pino logger module moves out of `@groot/server/core/logger/` into its own
  flat `@groot/logger` package (mirrors `@groot/database` as a leaf). This removes
  the `@groot/jobs` → `@groot/server` reach-through for logger exports and gives
  foundational infrastructure its own package boundary.

  **Breaking — migration required for downstream repos:**

  - All `@groot/server/core/logger` imports must move to `@groot/logger`. Affected
    surfaces: server middlewares, kv store, shared services, the jobs backend,
    the app bootstrap, and tests that `vi.mock` the logger.
  - The logger no longer reads `env`/`config` eagerly. The server bootstrap must
    call `configureLogger({ level, service, nodeEnv })` once before request
    handling — `apps/web/src/server/index.ts` now does this as the first statement
    in `main()`:
    ```ts
    import { configureLogger } from "@groot/logger";
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

  - `@groot/logger` is a leaf (deps: `pino`, `pino-pretty`, `dayjs`; `@types/express`/`@types/node` dev). No `@groot/*` deps.
  - `@groot/server`, `@groot/jobs`, and `apps/web` now declare `@groot/logger` as a workspace dependency.
  - `@groot/server` no longer contains the logger module; the `packages/server/src/core/logger/` directory is removed.
  - Configured via the esbuild/vitest/tsconfig `@groot/logger` alias.

### Patch Changes

- Updated dependencies [[`07de4af`](https://github.com/AshikNesin/groot/commit/07de4afce92948ac8a657284548d21fb7a670910)]:
  - @groot/logger@0.1.0

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
