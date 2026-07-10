# Changelog

## 1.13.1

### Patch Changes

- [`f23a88b`](https://github.com/AshikNesin/groot/commit/f23a88b3a2fbfa19e1a949948c6f1af71684f876) Thanks [@AshikNesin](https://github.com/AshikNesin)! - fix(sync): stop silently dropping synced files that were never committed

  The sync engine's `kept-local-deletion` bucket treated any file present in the
  baseline but missing from the working tree as an intentional local deletion.
  But the baseline is built from groot's tree, not the child repo's own history —
  so a file a prior sync wrote into the working tree but the child never
  committed (then swept, e.g. by `git clean -fd`) was indistinguishable from a
  deliberate `git rm`. The result: core synced files (stores, components, shared
  modules, skills, test mirrors) silently vanished from every future sync, only
  surfacing as a build break or as dozens of "Kept Local Deletions" the user has
  no memory of creating.

  The engine now consults the child repo's own history when classifying a
  missing-locally file: if the path was ever tracked on `HEAD` it's a real
  deletion (honored); if it was never committed it's a phantom and is restored
  from upstream on the next sync. The check is history-based (`git log -- <path>`)
  rather than a `cat-file -e HEAD:path` tree check, so committed `git rm`s are
  still respected — only never-tracked files are restored. Self-healing: one
  extra sync repopulates every lost file.

## 1.13.0

### Minor Changes

- [#55](https://github.com/AshikNesin/groot/pull/55) [`a468278`](https://github.com/AshikNesin/groot/commit/a46827823febc38373f20735af8c16b61902bb2f) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Performance, architecture, and accessibility pass driven by `react-doctor`. No
  breaking API changes.

  #### Performance
  - Parallelize independent awaits in the boilerplate sync engine
    (`.groot/lib/engine.ts`) — reconcile + apply phases now fan out per file.
  - Code-split CodeMirror behind `React.lazy` so it lands in its own chunk
    instead of the main bundle.
  - Fan out pg-boss per-queue setup and break the job index↔worker cycle.
  - Single-pass job filters and keyboard-toggle selection.

  #### Architecture
  - Split the four largest pages into focused components + custom hooks:
    `Jobs` (1433 → 132), `Storage` (629 → 171), `JobDetail` (474 → 128),
    `AppSettings` (339 → 206). Each sub-300 lines now.
  - Fix two `react-hooks/exhaustive-deps` findings with correct `useCallback`
    deps (no suppression comments).
  - Hoist pure helpers to module scope; adopt Zod 4 top-level format factories;
    make WebAuthn RP constants module-private.

  #### Fixes
  - Accessibility: breadcrumb current-page item now uses `aria-current="page"`
    instead of an incorrect `role="link"`; keyboard parity for input-group.
  - Remove derived-state syncing effects in favor of derived values.
  - Drop unused UI variant exports (`buttonVariants`, `badgeVariants`,
    `tabsListVariants`, `SkeletonVariants`) and the unused `TodoModel` class
    export.

  #### Tooling
  - Add `react-doctor` CI workflow, triage skill, and `doctor` script.
  - Drop redundant `@radix-ui/react-*` packages (covered by the `radix-ui`
    meta-package) and unused `p-limit`.
  - Delete the server bundle sourcemap after build; harden release install and
    add pnpm supply-chain gating.

## 1.12.0

### Minor Changes

- [`24d4895`](https://github.com/AshikNesin/groot/commit/24d4895e8564f2a7bf38ccf10ba27b8feca283b6) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Bump required Node engine to `24.x` and fix flaky Todos e2e selector.

  - **engines.node**: `>=22` → `24.x` (more restrictive; drop Node 22/23 support)
  - **e2e**: `Todos` page test now matches the page `<h1>` (`level: 1`) instead of any heading containing "todo", which was matching todo card titles (`<h3>`)
  - **.gitignore**: ignore local `.claude/settings.local.json`

## 1.11.0

### Minor Changes

- [#51](https://github.com/AshikNesin/groot/pull/51) [`feba7dc`](https://github.com/AshikNesin/groot/commit/feba7dc13d0a075b31ae60e958d7bc09d67d5715) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Port pending boilerplate improvements from downstream consumers:

  - **Auto-provisioned test database.** `pnpm test` now provisions an isolated
    `${dbName}_test` database in the same Docker container as dev, applies
    migrations, and runs the suite against it (dev DB untouched). New
    `TEST_DATABASE_URL` (test-env only), `scripts/ensure-test-db.ts`,
    `scripts/get-test-db-connection-string.cjs`, `ensureTestDatabase()`, a
    `pretest` hook, and `test:db:start` / `test:db:reset` scripts. `test` now
    runs with `NODE_ENV=test` so varlock's `forEnv(test)` resolution activates.
  - **Host-based test-DB safety guard.** `tests/server/_db-guard.ts`
    (`assertTestDatabase`) refuses to run unless the URL host is local AND the
    db name ends in `_test`, and hard-refuses known-prod hosts — so a
    misconfigured `TEST_DATABASE_URL` can never open a connection to a non-test
    database. Removed the orphaned duplicate `server/src/test/setup.ts`.
  - **`dev.ts` auto-reset of stale `db push`-managed dev DB.** Detects a
    database with tables but no `_prisma_migrations` table and resets it before
    `migrate deploy`, fixing the P3005 failure on the `db push` → `migrate`
    transition.
  - **`loadConfig()` accepts an optional schema parameter** so consumers can
    declare app-specific config sections without forking the synced schema.
  - **`core/lib/api.ts` no longer rejects falsy response payloads** (`0`,
    `false`, `""`, `null`) — uses an `undefined` check instead of falsy.
  - **`check-design-tokens.ts` bans `neutral`/`stone`** and uses an exact-path
    allowlist for the token layer.

## 1.10.0

### Minor Changes

- [#49](https://github.com/AshikNesin/groot/pull/49) [`dcddda6`](https://github.com/AshikNesin/groot/commit/dcddda6c012e0200160520002b9176617fe774bd) Thanks [@AshikNesin](https://github.com/AshikNesin)! - chore(deps): update all packages to latest; migrate Vite+ 0.2, Tailwind v4, TypeScript 6

  Updates 50+ dependencies to their latest versions and migrates the toolchain to
  Vite+ 0.2, Tailwind CSS v4, and TypeScript 6. Deprecated packages are replaced
  and latent lint warnings cleaned up.

  ### Toolchain migrations
  - **Vite+ 0.1 → 0.2** via `vp migrate`. The catalog now pins real `vitest@4.1.9`
    — the `@voidzero-dev/vite-plus-test` wrapper is removed in 0.2.x, which fixes
    `vp test`: it previously could not resolve the `vitest` bin through the stale
    `vitest → @voidzero-dev/vite-plus-test` catalog alias (the wrapper ships
    `dist/cli.js` but no `bin` field).
  - **Tailwind CSS v3 → v4.** PostCSS now uses `@tailwindcss/postcss`, and the CSS
    entry uses `@import "tailwindcss"` + `@config`, preserving the existing
    shadcn/HSL design-token theme and the `tailwindcss-animate` plugin.
  - **TypeScript 5.9 → 6.** Removed the deprecated `baseUrl` (made `paths`
    relative) to satisfy the TS6 deprecation.
  - **Vite 8.** `server.hmr.*` → `server.ws.*` for the HMR websocket config.

  ### Breaking dependency changes
  - `@mariozechner/pi-ai` → `@earendil-works/pi-ai@0.80` (the `@mariozechner`
    package is deprecated). Imports use the `/compat` shim, which preserves the
    existing `stream`/`complete`/`getModel` API surface.
  - `bcryptjs` 2 → 3, which ships its own types, so `@types/bcryptjs` is removed.
  - Other majors: `express-rate-limit` 7 → 8, `files-sdk` 1 → 2, `js-yaml` 4 → 5
    (fixed the named-export import in `config.loader`), `prisma` 7.8,
    `pg-boss` 12.25, `lucide-react` 0.x → 1.x, `react`/`react-dom` 19.2,
    `@sentry/node` 10.63, `@tanstack/react-query` 5.101, and more.

  ### Code cleanup
  - Resolved 13 pre-existing oxlint `no-unused-vars` warnings: removed unused
    imports, an unused controller parameter, and switched to an optional catch
    binding.
  - Fixed a `ThinkingLevel` local-use bug in the AI module's type re-exports.

  ### Validation
  - `pnpm build` ✓, `pnpm test` (140/140) ✓, `pnpm lint` (0 warnings) ✓.

## 1.9.0

### Minor Changes

- [`2c894e6`](https://github.com/AshikNesin/groot/commit/2c894e6c7eaa8da61bafa6327540a0144c22be8e) Thanks [@AshikNesin](https://github.com/AshikNesin)! - feat(groot): v5 snapshot reconciliation + pi CLI resolve

  Rewrites the boilerplate sync engine from commit-diff detection to full-tree
  snapshot reconciliation, and replaces the in-process `@cline/sdk` agent with
  the pi coding agent CLI for conflict resolution.

  ### Sync engine (v5 snapshot reconciliation)
  - **Git-tracked baseline.** A parentless snapshot commit of every synced file
    at the last-sync state is stored as `refs/groot/baseline`. The baseline is
    rebuilt from the boilerplate checkout when missing or stale, making sync
    self-healing — no more "Invalid commit SHA" errors from shallow clones or
    rebased upstream history.
  - **Full-tree reconciliation.** Every synced file is classified across three
    trees (ours / base / theirs) in a single pass via a pure decision table
    (`.groot/lib/reconcile.ts`), replacing the old per-commit diff walk.
  - **Safe deletion sync.** Files removed upstream are deleted locally only when
    unmodified since the last sync; locally-modified deletions are flagged for
    review instead of silently dropped.
  - **Clean-tree precondition + crash-safe apply.** Sync refuses to overwrite
    files with uncommitted git changes unless `--force` is passed. The baseline
    ref and `boilerplate-sync.json` are advanced last, so a crash mid-apply never
    loses state or marks conflicts as resolved.
  - **Shared modules.** Sync logic extracted into `.groot/lib/` (patterns,
    config, git, acquire, baseline, reconcile, changelog, engine) to prevent
    drift between `sync.ts`, `resolve.ts`, and `upstream.ts`.

  ### Resolve (pi CLI)
  - **Replaces `@cline/sdk`.** Conflict resolution now shells out to the
    [pi](https://pi.dev) coding agent CLI (`pi -p`) in a locked-down single-shot
    mode: no session, no tools, no extensions, no skills, no prompt templates,
    no context files.
  - **Validated output.** The model's response is checked (non-empty, no conflict
    markers) before anything is written to disk. On failure it retries once with
    feedback, so a malformed response never reaches the working tree.
  - **Prerequisite change.** Install pi globally
    (`npm install -g --ignore-scripts @earendil-works/pi-coding-agent`) and
    authenticate with any pi-supported provider key (e.g. `ZAI_API_KEY`) or
    `pi` + `/login`. `@cline/sdk` is no longer a dependency.

  ### Tests
  - 22 unit tests for the reconciliation decision table
    (`tests/server/groot/reconcile.test.ts`).
  - 7 integration tests with fixture git repos covering check mode, apply +
    deletion sync, 3-way merge conflicts, `--skip-conflicts`, `--force`
    precondition, modified-file-deleted-upstream, and baseline self-healing
    (`tests/server/groot/sync-engine.test.ts`).

## 1.8.1

### Patch Changes

- `b7aa065` fix(groot): suppress package.json sync markers for non-managed keys

## 1.8.0

### Minor Changes

- [`e07a425`](https://github.com/AshikNesin/groot/commit/e07a4252f6a4ce0bf9c224b3e63c08e10b019298) Thanks [@AshikNesin](https://github.com/AshikNesin)! - feat(groot): resolve conflicts with the Cline SDK + GLM Coding Plan

  `pnpm groot:resolve` no longer shells out to the global `pi` CLI
  (`@earendil-works/pi-coding-agent`). It now runs the [Cline SDK](https://docs.cline.bot/sdk)
  in-process — pinned as a `devDependency` (`@cline/sdk`) — on the
  [GLM Coding Plan](https://docs.z.ai/devpack/tool/cline) over Z.AI's
  OpenAI-compatible endpoint.

  Why: downstream repos no longer need to `npm install -g` a separate binary and
  authenticate it; `pnpm install` alone provides everything, version-pinned.

  Migration for `groot:resolve` users:

  - Set your Z.AI (GLM) API key: `export ZAI_API_KEY=...` (documented in
    `.env.schema`). The old `pi` global install + `/login` is no longer used.
  - The `--thinking` flag is removed (no GLM equivalent); `--model` is kept and
    defaults to `glm-5.2`. Override the provider entirely with
    `GROOT_RESOLVE_PROVIDER` / `GROOT_RESOLVE_BASE_URL` / `GROOT_RESOLVE_MODEL`.
  - Resolution is now more robust: the agent writes each resolved file through a
    controlled `write_resolved_file` tool that refuses to leave conflict markers
    behind. The deterministic `package.json` merge and the rest of the sync flow
    are unchanged.

  Requires Node 22+ (the Cline SDK floor); `engines.node` is now declared
  explicitly.

## 1.7.0

### Minor Changes

- [`8346573`](https://github.com/AshikNesin/groot/commit/83465738c05d3a541a72e51edc65d1764b41df18) Thanks [@AshikNesin](https://github.com/AshikNesin)! - fix: update stale boilerplate setup script + add `pnpm groot:setup`

  The setup script had accumulated significant drift from the actual project
  convention. Rewritten to match the current codebase:

  - **Secrets**: Infisical references → Doppler (the project uses
    `@plugin(@varlock/doppler-plugin)` in `.env.schema`).
  - **Git hooks**: Python `pre-commit` tool → Vite+ hooks via `pnpm prepare`
    (`vp config` sets up `.vite-hooks/` with lint-staged + gitleaks).
  - **App name**: `RP_NAME` in `.env.schema` (gone) → `config.yml` where
    `app.name` and `passkey.rpName` actually live. Also updates the
    `@initDoppler(project=...)` reference in `.env.schema`.
  - **Removed dead seds**: logger service name and Sentry release are now
    derived dynamically from `config.app.name`, not hardcoded. `sentry.config.js`
    doesn't exist. `DATABASE_URL` is auto-derived from `package.json` name.
  - **`pnpm groot:setup`** added to `package.json` alongside the existing
    `groot:*` script family.
  - Updated `docs/quick-start.md` and `docs/setup-guide.md` to reference the
    new command.

### Patch Changes

- [`a7e8d26`](https://github.com/AshikNesin/groot/commit/a7e8d26bc5b336e190f51ac3efbe232e42231d65) Thanks [@AshikNesin](https://github.com/AshikNesin)! - fix(setup): correct script ordering + add git repo guard

  Two robustness fixes to the setup script:

  - **Install dependencies before hooks**: the old order called `pnpm prepare`
    (→ `vp config`) before `pnpm install`, so on a fresh clone with no
    `node_modules` it would fail because `vp` wasn't installed yet. Now
    `pnpm install` runs first and auto-triggers the `prepare` lifecycle
    script, which installs hooks in one step.
  - **Fail fast if not a git repo**: clear error instead of a cryptic
    `vp config` failure when run outside a git repository.

## 1.6.0

### Minor Changes

- `c92cfd5` feat(sync): resolve package.json conflicts deterministically (never via the AI agent)
- `8c6fb5d` feat(sync): three-way merges + AI conflict resolution (groot sync v4)

## 1.5.0

### Minor Changes

- [`ad97754`](https://github.com/AshikNesin/groot/commit/ad9775432513caa316b47c8f88d366bfff2d5847) Thanks [@AshikNesin](https://github.com/AshikNesin)! - feat: pooled DB support, db:baseline recovery, and SNS body-parsing

  Three production hardening changes, each closing a silent-failure gap:

  - **Pooled database connections (`DATABASE_URL_DIRECT`)**: `prisma.config.ts`
    now routes the migrate/introspection engine at `DATABASE_URL_DIRECT` when set,
    falling back to `DATABASE_URL`. The migrate engine uses prepared statements
    and is incompatible with transaction-mode poolers (Supabase Supavisor /
    PgBouncer / RDS Proxy), which fail with "prepared statement already exists"
    or hang past platform boot timeouts. Declared in `.env.schema`; documented in
    `docs/guides/database-migrations.md`. Optional — no change for direct-Postgres
    deployments.

  - **`pnpm db:baseline` recovery script**: one-shot, idempotent command that
    brings a drifted (`db push`-managed) database into the migrate workflow —
    diffs live DB → schema, applies additive SQL only (refuses DROP / RENAME /
    ALTER COLUMN), writes the SQL for review first, marks the baseline applied,
    and verifies. Usage: `pnpm db:baseline` / `pnpm db:baseline -- --dry-run`.

  - **Restore `express.text()` + body-parser limits**: `core/server.ts` now
    registers `express.text({ type: "text/plain" })` and raises the JSON/urlencoded
    limits to 50mb. AWS SNS posts webhooks (SES inbound email, S3 events,
    CloudWatch alarms) as `Content-Type: text/plain` even when the body is JSON;
    `express.json()` skips them so `req.body` arrived as `{}` and handlers 400'd
    silently. Regression test added.

### Patch Changes

- [`16de7e3`](https://github.com/AshikNesin/groot/commit/16de7e33bbb9cc276609f75f80e76db073a5a308) Thanks [@AshikNesin](https://github.com/AshikNesin)! - fix(core): reduce request logger noise and emit a single line per request
  - Suppress logs for Vite dev-server requests (/@fs/, /@vite/, /node_modules/,
    /src/ and asset extensions like .js, .css, .svg). These flooded dev logs.
  - Merge the "Incoming" and "Request completed" entries into a single log on
    `res.finish`, which halves log volume and keeps method, url, status, and
    duration in one line (`METHOD URL → STATUS in DURATION`).

## 1.4.0

### Minor Changes

- [`4b49c1b`](https://github.com/AshikNesin/groot/commit/4b49c1bb1f36effa07badcc5839ae4055aa7d989) Thanks [@AshikNesin](https://github.com/AshikNesin)! - refactor(storage): drop the built-in public file-sharing feature — keep the S3 core

  Same treatment as the AI cleanup. The boilerplate shipped a full public
  file-sharing product (password-protected, time-limited, access-counted links)
  layered on top of plain S3 upload/download. That's an opinionated SaaS feature
  every consumer inherited whether they needed a share-links product or not. The
  S3 file-management core is what earns its place; the sharing layer should live
  in `server/src/app/<feature>/` for apps that actually want it.

  Removed (was forcing a sharing product into the boilerplate):

  - `server/src/shared/storage/public-share.service.ts` — share create/revoke,
    JWT share tokens, bcrypt password verification, access-count incrementing,
    expiry cleanup (~250 lines).
  - `server/src/shared/storage/public-file.controller.ts` +
    `public-file.routes.ts` — the `/api/v1/public/files` surface
    (`serve`, `info`, `verify-password`).
  - `storage.controller.ts` / `storage.routes.ts` / `storage.validation.ts` —
    the `/storage/shares` CRUD endpoints and their Zod schemas
    (`createPublicShareSchema`, `listSharesForFileSchema`,
    `verifySharePasswordSchema`).
  - `storage/index.ts` — the `publicShare` / `PublicFileController` /
    `PublicFileRoutes` exports.
  - **Core leaks**: `generateShareToken` / `verifyShareToken` in `jwt.utils.ts`
    (share-only), `SHARE_ACCESS_DENIED` and `PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED`
    error codes, `publicFileRateLimiter`, and `config.rateLimits.publicFile`
    (schema + `config.example.yml`).
  - **DB**: `PublicFileShare` model, with a generated `drop_public_file_shares`
    migration (diffed via `prisma migrate diff`, not hand-written; the baseline
    migration is untouched).
  - **Client**: the share dialog, share hooks (`useStorageShares`,
    `useCreateShare`, `useRevokeShare`), `PublicShare` type, and the Share button
    in the Storage page.
  - Stale `/api/v1/public/files` + `/storage/shares` references across `docs/`.

  Kept (the S3 core):

  - `storage.service.ts` / `storage.controller.ts` / `storage.routes.ts` —
    plain S3 upload / download / list / delete / rename / folder ops.
  - `storage.utils.ts` (`sanitizeFileName`, `getContentType` — used by the
    remaining storage controller).
  - `storageRateLimiter` + `uploadRateLimiter`.

  > Note for consumers syncing from groot: if you built on the removed sharing
  > endpoints (`/api/v1/public/files/*`, `/storage/shares/*`), the `PublicShare*`
  > types, or `publicFileRateLimiter`, they disappear on the next `groot:sync`.
  > Move that code into your own `app/` layer before syncing. The schema/migrations
  > are never synced, so your `public_file_shares` table is untouched.

  Verified: `prisma validate` + `prisma generate` clean, `vp check` 0 errors,
  `pnpm test` 83 passing.

- [`4b49c1b`](https://github.com/AshikNesin/groot/commit/4b49c1bb1f36effa07badcc5839ae4055aa7d989) Thanks [@AshikNesin](https://github.com/AshikNesin)! - refactor(ai): drop the built-in AI chat/usage/conversation feature — keep only the core adapter

  The boilerplate shipped a full AI SaaS layer (chat endpoints, token-usage
  tracking, conversation persistence, a Dashboard UI) on top of the core
  `AIClient` adapter. That was over-scoped: opinionated feature code that every
  consumer inherited whether they wanted an AI chat app or not. The core adapter
  is the part that earns its place in the boilerplate — it's DB-free, route-free,
  opinion-free infrastructure, same tier as `logger`/`kv`/`storage`.

  This change removes the feature and leaves the adapter. Consumers who actually
  need chat/usage/conversations should build them in `server/src/app/<feature>/`
  using the adapter, exactly like any other feature.

  Removed (was forcing AI into the boilerplate):

  - `server/src/shared/ai/**` — chat routes, usage + conversation
    models/services/controllers, validation.
  - `client/src/core/{lib/ai-client,store/ai,types/ai}.ts` — synced "core" files
    that existed only to feed the AI UI.
  - `client/src/app/ai/**` — the Dashboard + hooks; `App.tsx` index route now
    redirects to `/todos`.
  - **DB**: `AIUsage` + `AIConversation` models and their `User` relations, with
    a generated `drop_ai_tables` migration (diffed via `prisma migrate diff`,
    not hand-written; the baseline migration is untouched).
  - **Config**: `config.ai.*` and `config.rateLimits.{ai,aiStream}` (schema,
    `config.yml`, `config.example.yml`).
  - `aiRateLimiter` / `aiStreamRateLimiter` and their error codes
    (`AI_RATE_LIMIT_EXCEEDED`, `AI_STREAM_RATE_LIMIT_EXCEEDED`).
  - Stale `/api/v1/ai` references across `docs/`, and the `shared/` directory
    comment in `AGENTS.md` (no longer lists `ai` — it lives only in `core/`).

  Kept:

  - `server/src/core/ai/**` — the `AIClient` adapter over `@mariozechner/pi-ai`
    (complete / stream / generateObject / embed).
  - `OPENAI_API_KEY` in `.env.schema`.

  > Note for consumers syncing from groot: if you built on the removed chat
  > feature, your imports (`@/shared/ai`, `@/core/lib/ai-client`,
  > `@/core/types/ai`, `@/core/store/ai`) and `/api/v1/ai` routes will go away on
  > the next `groot:sync`. Move that code into your own `app/` layer before
  > syncing. The schema/migrations are never synced, so your `ai_usage` /
  > `ai_conversations` tables are untouched.

  Verified: `prisma validate` + `prisma generate` clean, `vp check` 0 errors,
  `pnpm test` 83 passing.

### Patch Changes

- [`d024397`](https://github.com/AshikNesin/groot/commit/d0243972a6c15765143601dc7252e04ca2105099) Thanks [@AshikNesin](https://github.com/AshikNesin)! - fix(db): remove the prisma:push footgun — migrate is the only schema path

  Removes the `prisma:push` (`prisma db push`) script and switches the local dev
  DB bootstrap to `prisma migrate deploy`, so `db push` is no longer the default,
  most discoverable way to apply schema changes.

  `db push` bypasses the migration history entirely: it syncs the schema to one
  database but writes nothing to `prisma/migrations/` and never touches
  `_prisma_migrations`. The result is silent divergence — dev has the new schema,
  the migrations folder is stale, and production (which runs `migrate deploy` via
  the `prestart` hook) never sees the change. This is exactly what caused the
  production login outage in a downstream consumer: a schema refactor added
  `User.name`/`User.updatedAt`, `db push` updated dev, no migration was created,
  and prod's `findUnique()` hit `P2022: Database column does not exist`.

  Changes:

  - `package.json`: remove `prisma:push`. `db push` remains reachable via the raw
    passthrough (`pnpm prisma db push`) for rare legitimate cases (throwaway
    prototyping), but it is no longer a one-word npm script a developer types by
    reflex.
  - `scripts/dev.ts`: bootstrap the local DB via `prisma migrate deploy` instead
    of `prisma db push --accept-data-loss`, so a fresh dev DB is byte-identical
    to what `prestart` produces in production.
  - `AGENTS.md`: add a "never use `prisma db push`" rule to the Conventions
    section (the process backstop), and update the commands list.
  - `docs/guides/database-migrations.md`: strengthen the DON'T rule from "in
    production" to "for schema changes (bypasses migration history)".
  - README, quick-start, setup-guide, development.md, passkey docs: replace
    stale `pnpm prisma:push` / `npx prisma db push` instructions with the
    migrate equivalents.

  Verified: `prisma migrate deploy` against a fresh database created the baseline
  tables with correct `_prisma_migrations` tracking.

- [`4b49c1b`](https://github.com/AshikNesin/groot/commit/4b49c1bb1f36effa07badcc5839ae4055aa7d989) Thanks [@AshikNesin](https://github.com/AshikNesin)! - refactor(config): remove the dead `features.enableNotifications` flag

  `config.features.enableNotifications` was defined in the schema, config files,
  and docs, but **read by nothing**. The notification service derives its own
  enabled state directly from env vars (`PUSHOVER_USER_KEY` +
  `PUSHOVER_API_TOKEN`), so this flag promised to control something it never did.
  Dead config lies to readers — removed it.

  Changes:

  - `server/src/core/config/config.schema.ts`: drop the `features` block.
  - `config.yml` / `config.example.yml`: remove the `features:` section.
  - `server/src/core/config/index.ts`: drop the stale doc-comment example.
  - `docs/config.md`: drop the `features.enableNotifications` settings row.
  - `tests/server/core/config/config.test.ts`: drop the `features` assertions;
    the boolean-coercion test now exercises `jobs.enabled` instead.

  Verified: `vp check` 0 errors, `pnpm test` 83 passing.

## 1.3.1

### Patch Changes

- Fix boilerplate sync patterns to match the actual ui/core/app frontend layering.

  The sync tool (`pnpm groot:sync`) and its docs referenced layout paths from
  before the frontend was split into `ui/`, `core/`, and `app/` layers. As a
  result, legitimate boilerplate files fell through to the default-skip branch
  and were never synced into child repos:

  - `client/src/core/**` (layouts, stores, hooks, lib, types, services) was
    unmatched — e.g. `client/src/core/store/ai.ts` was wrongly skipped. The dead
    patterns (`client/src/components/ui/**`, `client/src/lib/**`,
    `client/src/hooks/**`, `client/src/store/**`, `client/src/pages/**`,
    `client/src/services/**`) are removed and replaced with the real
    `client/src/ui/**` + `client/src/core/**` sync patterns and
    `client/src/app/**` skip pattern.
  - `tests/**` had no coverage, so boilerplate-mirrored tests
    (`tests/server/{core,shared}/**`, `tests/{server,client}/setup.ts`,
    `tests/client/components/ui/**`) were skipped. Added; project-local tests
    (`tests/server/app/**`, `tests/server/routes/**`, `tests/e2e/**`) are now
    explicitly skipped.
  - Only `.agents/skills/groot-sync/**` synced, so the `node`,
    `grill-me`, and `improve-codebase-architecture` skills were skipped. Broadened
    to `.agents/skills/**`.

  Docs (`.agents/skills/groot-sync/SKILL.md`, `docs/sync-guide.md`) updated to
  match. Verified via `pnpm groot:check`: all previously-skipped core/skill/test
  files now resolve to autoApply or needsReview as expected.

## 1.3.0

### Minor Changes

- `8483133` feat(env): upgrade varlock to 1.9.0, switch secrets plugin from Infisical to Doppler, and wire it into .env.schema

### Patch Changes

- `daa8ec6` refactor(ai): remove Gemini provider, leaving OpenAI as the sole built-in AI provider
- `f001b66` refactor(ai): trim built-in AI providers to OpenAI and Google (Gemini)

## 1.2.0

### Minor Changes

- `d9b038e` Rename admin auth header from `X-Admin-Auth` to `X-Admin-Auth-Key`

## 1.1.0

### Minor Changes

- `7b15a3a` ## Build: copy `server/public/` → `dist/public/`

## 1.0.2

### Patch Changes

- `e97ecc8` Use config.app.name instead of a hardcoded groot@ prefix when building the Sentry release identifier in instrument.ts.
- `65f3d9a` Reuse a clean local `~/Code/groot` checkout during `groot:sync` and `groot:upstream` instead of re-cloning the boilerplate on every run. Falls back to a fresh clone when the local checkout is missing, dirty, has a mismatched origin, or can't be fast-forwarded. Reused checkouts are never modified destructively or deleted.

All notable changes to the groot boilerplate will be documented in this file.

This changelog is automatically generated by [changesets](https://github.com/changesets/changesets).
For the pre-changesets history, see [docs/CHANGELOG.md](docs/CHANGELOG.md).

## 1.0.1

### Patch Changes

- [`f3a4cef`](https://github.com/AshikNesin/groot/commit/f3a4cef2f2f75286632dbcab941fa937626ee778) Thanks [@AshikNesin](https://github.com/AshikNesin)! - Fix CI release-notes extraction, boilerplate sync/upstream tooling, and changeset access config:
  - **release workflow:** GitHub Release notes no longer always fall back to `--generate-notes`. The `awk` range pattern matched the version header as both start and end, so it emitted only the header line and `head -n -1` stripped it, always producing empty notes. `changesets/action` is also now pinned to a commit SHA (was a floating `@v1` tag).
  - **groot sync:** `extractChangelog` no longer captures the entire changelog when `last_sync.version` is unset (commit-SHA `fromRef` had no version to anchor the stop boundary). Breaking-change detection now matches scoped conventional commits like `feat(scope)!:`. Cloning no longer hardcodes `--branch main` (detects the default branch).
  - **groot upstream:** Both clones and the PR `--base` now use the boilerplate's detected default branch instead of hardcoded `main`. `gh pr create --repo` now correctly parses SSH URLs (`ssh://git@github.com/...`, `git@github.com:...`) in addition to HTTPS.
  - **changeset config:** `access` set to `public` to match the ISC-licensed open-source intent.
- [`7f414be`](https://github.com/AshikNesin/groot/commit/7f414be9f71de04b715f83055e957d339773f366) [`f9cc070`](https://github.com/AshikNesin/groot/commit/f9cc0704b865bdfe5c87ec2a517e7ae27bca3671) Fix the Release workflow so it can actually run (the above fixes shipped, but the workflow itself had never succeeded — three stacked blockers masked each other):
  - **`pnpm/action-setup` SHA:** was pinned to a commit that doesn't exist in the repo — same 7-char prefix as `v4.0.0`, but the remainder was invalid — so the action could not be resolved and every Release run failed immediately. Pinned to the real `v4.0.0` commit.
  - **pnpm version source:** now read from `packageManager` (`pnpm@10.32.1`) instead of a `version: 10` input, which conflicted with `packageManager` and caused "Multiple versions of pnpm specified."

## 1.0.0

### Major Changes

- [#37](https://github.com/AshikNesin/groot/pull/37) [`d286b33`](https://github.com/AshikNesin/groot/commit/d286b338c0ff2408741016feb88dd3ce22c7a542) - Initial public release of the Groot starter kit: a minimal Express 5 + React 19 + Postgres boilerplate featuring JWT + Passkey (WebAuthn) auth, a CSS-variable design-token UI component system, S3-compatible file storage, pg-boss background jobs, Playwright e2e tests, and deterministic boilerplate sync/upstream tooling (`pnpm groot:sync` / `groot:upstream`).
