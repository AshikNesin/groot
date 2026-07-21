# @groot/web

## 0.2.10

### Patch Changes

- Updated dependencies [[`a9b3825`](https://github.com/AshikNesin/groot/commit/a9b3825a930988d6fcbe9e7f0e53cc8fce5b470e)]:
  - @groot/jobs@0.7.0

## 0.2.9

### Patch Changes

- [`b0a391b`](https://github.com/AshikNesin/groot/commit/b0a391b85274ab8cf2f6837b8dda4dadf6f716a1) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Rename `*.validation.ts` to `*.schema.ts`

  These files contain only Zod schemas, not validation logic, so the
  naming was misleading. Renamed `auth`, `passkey`, `app-settings`,
  `storage`, and `todo` validation files to `*.schema.ts` and updated
  all imports across `@groot/core`, `@groot/web`, the docs, and
  `AGENTS.md`. This is a pure rename — no behavior change.

- Updated dependencies [[`b0a391b`](https://github.com/AshikNesin/groot/commit/b0a391b85274ab8cf2f6837b8dda4dadf6f716a1), [`b0a391b`](https://github.com/AshikNesin/groot/commit/b0a391b85274ab8cf2f6837b8dda4dadf6f716a1), [`b0a391b`](https://github.com/AshikNesin/groot/commit/b0a391b85274ab8cf2f6837b8dda4dadf6f716a1), [`b0a391b`](https://github.com/AshikNesin/groot/commit/b0a391b85274ab8cf2f6837b8dda4dadf6f716a1)]:
  - @groot/ui@0.2.1
  - @groot/jobs@0.6.2
  - @groot/shell@0.5.0
  - @groot/core@0.7.1

## 0.2.8

### Patch Changes

- Updated dependencies [[`986c902`](https://github.com/AshikNesin/groot/commit/986c9024f0f5a106a4a8822b96605c8ef9eee225)]:
  - @groot/jobs@0.6.1

## 0.2.7

### Patch Changes

- Updated dependencies [[`e0d78f5`](https://github.com/AshikNesin/groot/commit/e0d78f5d17c27df512cd53ec20277ffdc9cf19bb)]:
  - @groot/core@0.7.0
  - @groot/jobs@0.6.0

## 0.2.6

### Patch Changes

- Updated dependencies [[`40eb1ec`](https://github.com/AshikNesin/groot/commit/40eb1ece15b0b3c299b32f12763f2c7be4ff25d0), [`40eb1ec`](https://github.com/AshikNesin/groot/commit/40eb1ece15b0b3c299b32f12763f2c7be4ff25d0), [`1e85141`](https://github.com/AshikNesin/groot/commit/1e851410f1b5cdce9a6bcafd269da4f091c99245), [`225280b`](https://github.com/AshikNesin/groot/commit/225280b0899784e6fd92a363adb141dc7647bd24)]:
  - @groot/core@0.6.1
  - @groot/jobs@0.5.2
  - @groot/shell@0.4.0

## 0.2.5

### Patch Changes

- Updated dependencies [[`86c1657`](https://github.com/AshikNesin/groot/commit/86c165721799f81f001ea8f3c986ffc984551b4e)]:
  - @groot/core@0.6.0
  - @groot/jobs@0.5.1

## 0.2.4

### Patch Changes

- Updated dependencies [[`0c47508`](https://github.com/AshikNesin/groot/commit/0c47508c31623b46f051257048c19f7c86c89e2b)]:
  - @groot/core@0.5.0
  - @groot/jobs@0.5.0

## 0.2.3

### Patch Changes

- Updated dependencies [[`5f9eddd`](https://github.com/AshikNesin/groot/commit/5f9eddd7bba05222c378578a7d0900dac53d52a2)]:
  - @groot/core@0.4.1
  - @groot/shell@0.3.1
  - @groot/jobs@0.4.1

## 0.2.2

### Patch Changes

- Updated dependencies [[`83b3a6f`](https://github.com/AshikNesin/groot/commit/83b3a6f1ce34a28299b00f18645faabf3e9569a8)]:
  - @groot/core@0.4.0
  - @groot/ui@0.2.0
  - @groot/shell@0.3.0
  - @groot/jobs@0.4.0

## 0.2.1

### Patch Changes

- Updated dependencies [[`ae54b49`](https://github.com/AshikNesin/groot/commit/ae54b4920f39b2dbd9432298855210cb4752cd57)]:
  - @groot/core@0.3.0
  - @groot/shell@0.2.0
  - @groot/jobs@0.3.0
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
  - @groot/jobs@0.2.0
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
  - @groot/jobs@0.1.0
