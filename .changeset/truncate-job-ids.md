---
"@groot/jobs": patch
---

Truncate job IDs in the jobs list and toasts

Job IDs are now shown truncated to 6 characters in the jobs list, and
the same `formatJobId` helper is reused for job IDs in toasts so the
short form is consistent everywhere a job is referenced.
