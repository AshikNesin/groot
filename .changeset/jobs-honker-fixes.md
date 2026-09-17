---
"@groot/jobs": patch
---

Start the honker scheduler loop and support multiple schedules per queue via options.key

Two honker (SQLite) fixes:

- The scheduler loop was never started, so cron schedules never fired. The adapter now starts honker on init.
- `schedule()` used the job name as the honker schedule name, so scheduling the same job at two different times (e.g. 9:30am and 6pm daily) overwrote the first entry. `ScheduleJobOptions.key` is now honored by naming the schedule `job:key` (plain job name when no key, back-compat), mirroring pg-boss's singleton-key schedules. `getSchedules()` maps the composite name back to `{ name, key }`; `unschedule(name, key)` removes one entry.
