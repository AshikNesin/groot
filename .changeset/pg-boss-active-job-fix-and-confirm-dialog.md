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
