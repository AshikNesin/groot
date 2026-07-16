---
"@groot/jobs": patch
---

perf: reduce memory and connection overhead in job queue

- **PgBoss connection pool**: explicitly capped at `max=3` connections (`idleTimeoutMillis=30s`, `connectionTimeoutMillis=5s`). Previously used pg's default of `max=10`, creating up to 10 idle connections for background-job polling that needs at most 2-3.
- **Job logger**: reuse a single module-level `pino-pretty` stream instance across all job executions instead of allocating a new `Transform` + `SonicBoom` writer on every job run.
