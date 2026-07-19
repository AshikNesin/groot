---
"@groot/jobs": patch
---

fix(jobs): completed jobs and job types not visible on SQLite (honker)

Two bugs in the honker (SQLite) adapter made the jobs dashboard lose parity
with the Postgres (pg-boss) engine:

1. **Completed jobs vanished.** `job.ack()` calls honker's `honker_ack()`,
   which DELETEs the row from `_honker_live`. pg-boss keeps completed jobs with
   `state='completed'` so the dashboard can list them. The adapter now marks
   the job `state='done'` in-place via SQL UPDATE (with a `worker_id` + claim
   guard to avoid races) instead of deleting it.

2. **Completed/expired/cancelled state filters returned nothing.** The state
   filter queries had inline ternaries mapping `created`→`pending` and
   `active`→`processing`, but were missing `completed`→`done` (and
   `failed`→`dead`). Even if completed jobs existed, `WHERE state='completed'`
   matched nothing. Extracted a proper `toHonkerState()` reverse-mapping used
   by `getJobsByState`, `getJobs`, and `purgeJobsByState`.

3. **"Add Job" dropdown was empty.** `getAvailableQueues()` only returns queues
   with rows currently in `_honker_live`. On a fresh database (or after
   purging), no job types appeared even though handlers were registered.
   `queries.getAvailableQueues()` now returns the union of adapter queues and
   registered handlers (`getRegisteredHandlers()`), which is the source of
   truth for triggerable job types.
