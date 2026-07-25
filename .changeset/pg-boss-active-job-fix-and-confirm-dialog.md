---
"@groot/jobs": patch
"@groot/ui": patch
"@groot/shell": patch
"groot": patch
---

Fix pg-boss jobs list showing blank metadata; replace native confirm with a styled dialog

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

Also replaces every native `window.confirm()` in the jobs page (bulk re-run,
purge-by-state, delete job, cancel scheduled job) and the storage page
(delete files, delete folder) with a new shared `ConfirmProvider`/
`useConfirm` from `@groot/ui` — a Radix Dialog-based confirmation with
destructive styling, mounted once at the app root.
