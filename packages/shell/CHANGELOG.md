# @groot/shell

## 0.4.0

### Minor Changes

- [#74](https://github.com/AshikNesin/groot/pull/74) [`1e85141`](https://github.com/AshikNesin/groot/commit/1e851410f1b5cdce9a6bcafd269da4f091c99245) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Add `loginWithPasskey` to the shell auth store

  `useAuthStore` now exposes `loginWithPasskey(email?)`, which runs the WebAuthn
  ceremony via the existing `passkeyService.loginWithPasskey` and — on success —
  sets `isAuthenticated`/`user` and bumps `generation`, mirroring password login.

  Previously apps that wanted passkey login had to fork the store and track a
  separate `username` field. Now any app can `<PasskeyManager>` + call
  `loginWithPasskey` directly from `@groot/shell/store/auth`, keeping a single
  auth store. No change to existing fields or behavior.

- [#74](https://github.com/AshikNesin/groot/pull/74) [`225280b`](https://github.com/AshikNesin/groot/commit/225280b0899784e6fd92a363adb141dc7647bd24) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Add `header` / `padded` / `mainClassName` / `className` slots to the shell `Layout`

  `<Layout/>` now accepts:

  - `header?: ReactNode` — render a custom header/nav (e.g. an app `<Navbar/>`)
    instead of the default shell header (logo + command palette + user menu).
  - `padded?: boolean` (default `true`) — toggle `<main>`'s default padding. Set
    `false` when pages own their own padding via `PageContainer`.
  - `mainClassName?` / `className?` — extra classes merged onto `<main>` / the
    outer wrapper.

  Fully backward compatible: `<Layout/>` with no props behaves exactly as before.
  Lets apps brand the shell without forking the whole layout component.

## 0.3.1

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

## 0.3.0

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
  - @groot/ui@0.2.0

## 0.2.0

### Minor Changes

- [#64](https://github.com/AshikNesin/groot/pull/64) [`ae54b49`](https://github.com/AshikNesin/groot/commit/ae54b4920f39b2dbd9432298855210cb4752cd57) Thanks [@AshikNesin](https://github.com/AshikNesin)! - refactor: reorganize codebase architecture

  - Flattened the `packages/` directory, merging `server`, `logger`, and `database` into `core`.
  - Renamed `client` to `shell`.
  - Moved boilerplate `auth`, `settings`, and `storage` modules out of `apps/web/src/client/pages` and into `@groot/shell`.
  - Replaced all legacy paths with their new equivalents in all codebase documentation, tests, and comments.

### Patch Changes

- Updated dependencies [[`ae54b49`](https://github.com/AshikNesin/groot/commit/ae54b4920f39b2dbd9432298855210cb4752cd57)]:
  - @groot/ui@0.1.0

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
