# @groot/shell

## 0.9.0

### Minor Changes

- [`399ee35`](https://github.com/AshikNesin/groot/commit/399ee35d36a4bae5fcd3df68b481170d6f68da53) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Make the page shell the single owner of page chrome, and adopt the shared primitives across shell pages.

  - **`PageHeader` / `PageLayout` gain `breadcrumb` and `titleAdornment` slots**, and `description` widens from `string` to `ReactNode`. Detail pages previously copy-pasted `PageHeader`'s `<h1>` classes because there was nowhere to put a breadcrumb trail or a status pill.
  - **`Section` gains `meta` and `actions` slots** and now renders a `text-sm` heading, matching the "label + count" pattern that pages were hand-rolling. It had no consumers before.
  - **`Storage` now renders through `PageLayout`**, dropping its own `max-w-7xl` container and `text-2xl font-medium` `<h1>` (which disagreed with every other page title). Its breadcrumb uses the `Breadcrumb` primitive and its file list uses `Table`/`TableRow`/`TableCell` instead of a raw `<table>`.
  - **`AppSettings` and `PasskeyManager` now use `Card`** instead of hand-rolled `rounded-xl border border-border bg-card` divs, so the Settings page no longer has visibly different card edges than the rest of the app (`Card` uses a ring, not a border).
  - **Destructive confirmations now use `useConfirm()`** in `AppSettings` and `PasskeyManager`, replacing two bespoke `Dialog`s that could be dismissed by an overlay click. `useAppSettings` no longer returns the now-unused `showDeleteDialog` / `setShowDeleteDialog` / `requestDelete`.
  - `ProtectedRoute` uses `LoadingSpinner` instead of a hand-rolled spinner div; redundant `mr-2` margins on icons inside gap-spaced menu items are removed.

### Patch Changes

- Updated dependencies [[`399ee35`](https://github.com/AshikNesin/groot/commit/399ee35d36a4bae5fcd3df68b481170d6f68da53)]:
  - @groot/ui@0.4.0

## 0.8.0

### Minor Changes

- [`c097350`](https://github.com/AshikNesin/groot/commit/c0973502ae2e731094876e05dcfc9b3db6b3ccfc) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Re-export `NavItem` from `Layout` so app consumers can import it from the same path they pass `navItems` to.

## 0.7.0

### Minor Changes

- [#105](https://github.com/AshikNesin/groot/pull/105) [`5efcd19`](https://github.com/AshikNesin/groot/commit/5efcd19c4d87de3afc47c32d8aae8fe2bd20e525) Thanks [@exe-dev-github-integration](https://github.com/apps/exe-dev-github-integration)! - Refine shell loading and hydration states: read the sidebar collapsed preference synchronously from `localStorage` (fixes the collapse flash on reload), give `<main>` a min-height for a stable footprint while content loads, and show a centered spinner during the initial auth check instead of a blank screen.

### Patch Changes

- [#107](https://github.com/AshikNesin/groot/pull/107) [`0051546`](https://github.com/AshikNesin/groot/commit/005154619ee39ca399a96bcea02ba0fbbcfd3e91) Thanks [@AshikNesin](https://github.com/AshikNesin)! - PageHeader actions now wrap on narrow viewports (fixes mobile overflow), and the vite client config dedupes its `@groot/*` alias list into a single const shared by the build and the test runner.

## 0.6.2

### Patch Changes

- Updated dependencies [[`90c30e0`](https://github.com/AshikNesin/groot/commit/90c30e02b09c3e355bd8a0aa0f431006dd55431b)]:
  - @groot/ui@0.3.0

## 0.6.1

### Patch Changes

- [#102](https://github.com/AshikNesin/groot/pull/102) [`011c6d5`](https://github.com/AshikNesin/groot/commit/011c6d5595ea9e4fff8911f56e497e497aecb380) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Fix pg-boss jobs list showing blank metadata; replace native confirm with a styled dialog

  The jobs dashboard table was missing data for pg-boss (Postgres) jobs: the
  "Started" column showed "—", "Created" showed "N/A", retry counts read 0, and
  expire/keep-until/dead-letter were empty — for _every_ job in the list (active
  jobs most visibly, since they always have a `started_on`). The stats counts at
  the top of the page were correct; only the per-row metadata was broken.

  Root cause: the raw-SQL dashboard queries (`getJobs`/`getJobsByState`/
  `getFailedJobs`) aliased columns to lower-case keys (`startedon`), but the
  shared `normalizeBossJob` reads pg-boss's camelCase shape (`startedOn`), so
  every camelCase field resolved to `undefined` → null/empty/0. Only
  `getJobById` (pg-boss's own accessor) was correct, which is why the detail
  page showed the right values. Fixed by aliasing the raw-SQL projection to
  camelCase (double-quoted so Postgres preserves case), matching the shape
  `normalizeBossJob` reads, so both paths agree.

  Also replaces every native `window.confirm()` — jobs page (bulk re-run,
  purge-by-state, delete job, cancel scheduled job) and storage page (delete
  files, delete folder) — with a new shared `ConfirmProvider`/`useConfirm`, a
  thin imperative convenience layer over a Radix `AlertDialog` primitive (a port
  of shadcn's `alert-dialog`). Both live under `@groot/ui/primitives` so callers
  know they are composed/Radix-backed, not direct shadcn re-exports. Using
  AlertDialog gives correct confirm semantics: the dialog can ONLY be closed by
  the action/cancel buttons or Escape (not by clicking the overlay), so a
  confirmation can never be dismissed accidentally. `Button` now exports a named
  `ButtonProps` so the alert-dialog action/cancel slots compose with the shared
  button variants (destructive, outline).

- Updated dependencies [[`011c6d5`](https://github.com/AshikNesin/groot/commit/011c6d5595ea9e4fff8911f56e497e497aecb380)]:
  - @groot/ui@0.2.2

## 0.6.0

### Minor Changes

- [#98](https://github.com/AshikNesin/groot/pull/98) [`b9906ec`](https://github.com/AshikNesin/groot/commit/b9906ec95ba2702d5f7f3176333e65be30a2ff8f) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Make the shell Layout/SidebarNav/CommandPalette/Storage app-configurable

  The shell app shell (Layout, SidebarNav, CommandPalette) and the Storage page
  now accept optional props so child apps can brand the shell and extend the
  command palette / user menu without forking the components. All new props are
  optional with defaults that preserve the existing groot behavior, so the
  boilerplate's own app is unchanged.

  - `Layout`: `navItems`, `brand`, `userMenuItems`, `commandGroups` props. The
    sidebar offset (`lg:pl-56`/`lg:pl-16`) and the mobile top bar are now gated
    on `header === undefined` so a custom header no longer double-pads the page.
    The footer user dropdown is driven by `userMenuItems` (default = the prior
    Storage/Jobs/Settings + Log out entries) and supports `to`/`href`/`onSelect`
    entries with optional separators and destructive styling.
  - `SidebarNav`: `NavItem.icon` accepts a `LucideIcon` directly (in addition to
    the existing string keys). New `brand` prop (`{ label, icon?, to? }`) replaces
    the hardcoded "Groot" label/logo.
  - `CommandPalette`: `CommandPaletteDialog({ groups })` accepts custom
    `CommandGroupEntry[]` (default = the prior Navigation + Account groups).
  - `Storage`: optional `onView?: (file: StorageFile) => void` lets an app
    intercept "View" clicks for an in-app viewer (falls back to the existing
    open-in-new-tab behavior). The bulk-upload input was wired but never
    triggered by any button (dead code); the single Upload input is now
    `multiple` and routes 1-file vs multi-file uploads internally.

## 0.5.0

### Minor Changes

- [`b0a391b`](https://github.com/AshikNesin/groot/commit/b0a391b85274ab8cf2f6837b8dda4dadf6f716a1) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Redesign settings UI with a dub-inspired card layout

  The Settings page, AppSettings, and PasskeyManager components have been
  reworked into a cleaner card-based layout inspired by Dub. The redundant
  desktop top toolbar in the Layout was also removed since the sidebar
  already provides navigation.

### Patch Changes

- [`b0a391b`](https://github.com/AshikNesin/groot/commit/b0a391b85274ab8cf2f6837b8dda4dadf6f716a1) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Improve form field spacing and consistency

  The shared `form.tsx` primitives now apply more consistent spacing
  between fields. Updated the job dialogs (Add/Edit/Schedule) and
  AppSettings form to use the improved form components for uniform
  vertical rhythm across forms.

- Updated dependencies [[`b0a391b`](https://github.com/AshikNesin/groot/commit/b0a391b85274ab8cf2f6837b8dda4dadf6f716a1)]:
  - @groot/ui@0.2.1

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
