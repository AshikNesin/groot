---
"@groot/jobs": patch
---

Simplify the jobs client: single source of truth for job types, withJobToast, shared job utils

- The jobs client `Job`/`ScheduledJob` now alias the server adapter's `QueueJob`/`ScheduledJobInfo` (type-only import, erased in the client bundle) — one source of truth instead of two drifting 19-field shapes; the dead client `JobState` enum and two re-export shims are deleted.
- `withJobToast` helper replaces 15 identical try/toast/catch blocks in `useJobs`/`useJobDetail`.
- Job-level options helpers (`todoJobOptions`) and dead validation/constant exports removed.
