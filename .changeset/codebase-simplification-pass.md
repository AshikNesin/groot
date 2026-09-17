---
"@groot/core": minor
"@groot/jobs": minor
"@groot/shell": minor
"@groot/ui": minor
---

Codebase simplification pass — dead code, duplication, API surface

Audit-driven cleanup, no behavior changes. Verified green across every layer: typecheck, lint, 211 unit tests, full build, 6 e2e tests. All removals were verified to have zero real consumers via import-graph resolution.

Dead code (~1,300 LOC across 22 files):

- date/shell lib helpers with zero callers (25→9 date fns; dropped `formatCurrency`, `debounce`, `truncate`, `getInitials`)
- one-line Prisma pass-throughs in auth/passkey services; never-wired `auth.deleteUser`, `storage.copyFile`, 6 storage DTO aliases
- vestigial breadcrumb subsystem (zero `addBreadcrumb` callers), dead `createLogger`/`logPerformance`/`parseLimit`/`useBulkUpload`/`todoJobOptions`
- 4 orphan ui primitives: `alert`, `pagination`, `select`, `tooltip` (423 lines, zero real importers)

Duplication:

- The jobs client `Job`/`ScheduledJob` types now alias the server adapter's `QueueJob`/`ScheduledJobInfo` instead of maintaining a second drifting 19-field shape
- `withJobToast` helper replaces 15 identical try/toast/catch blocks in `useJobs`/`useJobDetail`
- `TextInputDialog` consolidates the CreateFolder/Rename dialogs

Also fixes pre-existing breaks on main: the job-logger level gate was typed `pino.LevelWithSilent` (root tsc exited 2), the pretest hook resolved the DEV database when NODE_ENV wasn't set (now `NODE_ENV=test` everywhere; `ensure-test-db.ts` refuses to run when `TEST_DATABASE_URL` is unset), and login + todos e2e specs drifted from the UI copy.
