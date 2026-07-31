# @groot/ui

## 0.4.0

### Minor Changes

- [`399ee35`](https://github.com/AshikNesin/groot/commit/399ee35d36a4bae5fcd3df68b481170d6f68da53) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Add the missing state primitives and converge the badge/table surfaces so pages stop hand-rolling them.

  - **New `EmptyState` / `ErrorState`** — one canonical icon + title + description + action shape, replacing the six divergent empty/error stacks that had grown across Todos, Jobs, Storage, Settings, and Passkeys.
  - **`LoadingState`** now accepts `size` and `className`, so surfaces needing a fixed height (e.g. `h-96` inside a card) can use it instead of wrapping `LoadingSpinner` in a bespoke box.
  - **`StatusBadge` is now built on `Badge`**, inheriting its pill shape and typography. It previously rendered as an unrounded rectangle at `text-[11px]`, so the same semantic looked different depending on which component a page reached for. Status pills change appearance slightly as a result.
  - **`Table` now matches the app's real table density** (`px-4 py-3` cells, `px-4 py-2.5` heads) and `TableHead` applies the shared uppercase column-header style. The new **`tableColumnHeaderClass`** export lets grid-based tables (whose rows are links, so they can't use `<th>`) share that exact token instead of redeclaring it locally.
  - `LoadingSpinner` uses `size-*` shorthand.
  - **New generic skeleton family** — `SkeletonCard` (title bar + body lines, or a custom body via `children`), `SkeletonList` (rows with optional leading block, secondary line, trailing pill), and `SkeletonTable` (header band + per-column bars) join the base `Skeleton`. Pages compose these instead of defining per-page skeleton components. **Breaking-ish:** the old `SkeletonList` variant API (`count`/`variant` with hardcoded TableRow/Card/ListItem/Text shapes) is replaced by the new row-oriented props (`rows`/`leading`/`secondaryLine`/`trailing`); it had no consumers in this repo.

## 0.3.0

### Minor Changes

- [#103](https://github.com/AshikNesin/groot/pull/103) [`90c30e0`](https://github.com/AshikNesin/groot/commit/90c30e02b09c3e355bd8a0aa0f431006dd55431b) Thanks [@exe-dev-github-integration](https://github.com/apps/exe-dev-github-integration)! - Add `GrootUIProvider` — a single root provider composing `ConfirmProvider` and the `Toaster`. App authors now mount one `<GrootUIProvider>` instead of remembering to wire up each cross-cutting UI provider individually (previously a hidden, transitive requirement for any consumer of `useConfirm()`). The individual exports remain available for callers that need finer control.

## 0.2.2

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

## 0.2.1

### Patch Changes

- [`b0a391b`](https://github.com/AshikNesin/groot/commit/b0a391b85274ab8cf2f6837b8dda4dadf6f716a1) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Improve form field spacing and consistency

  The shared `form.tsx` primitives now apply more consistent spacing
  between fields. Updated the job dialogs (Add/Edit/Schedule) and
  AppSettings form to use the improved form components for uniform
  vertical rhythm across forms.

## 0.2.0

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

## 0.1.0

### Minor Changes

- [#64](https://github.com/AshikNesin/groot/pull/64) [`ae54b49`](https://github.com/AshikNesin/groot/commit/ae54b4920f39b2dbd9432298855210cb4752cd57) Thanks [@AshikNesin](https://github.com/AshikNesin)! - refactor: reorganize codebase architecture

  - Flattened the `packages/` directory, merging `server`, `logger`, and `database` into `core`.
  - Renamed `client` to `shell`.
  - Moved boilerplate `auth`, `settings`, and `storage` modules out of `apps/web/src/client/pages` and into `@groot/shell`.
  - Replaced all legacy paths with their new equivalents in all codebase documentation, tests, and comments.
