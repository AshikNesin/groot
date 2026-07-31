---
"@groot/jobs": patch
---

Adopt the shared UI primitives in the jobs client instead of local reimplementations.

- `JobDetail` renders through `PageLayout`, using the new `breadcrumb` / `titleAdornment` slots and the `Breadcrumb` primitive. It previously duplicated `PageHeader`'s `<h1>` classes verbatim and hand-rolled its breadcrumb trail.
- `JobsTable` and `ScheduledJobsPanel` use `Section` for their headings and import `tableColumnHeaderClass` instead of each declaring a local `COLUMN_HEADER` constant.
- Empty and error surfaces in `JobsTable` and `JobDetail` use `EmptyState` / `ErrorState`, so their icon sizes and spacing now match every other list in the app.
