---
"@groot/jobs": patch
---

DB-persisted job logs gated by ops log level — dashboard showed nothing in production

The pino ROOT level (from config.logging.level, default `warn` in production) gated records before the JobLogStream ever saw them: info lines from job handlers were dropped, job_logs stayed empty, and the dashboard's log panel rendered nothing at all. Additionally pino.multistream's per-stream default level is `info`, so debug lines never persisted even in dev.

- Pin the DB stream to an `info` floor: quieter ops levels (warn/error) only quiet the console, never the persisted history the dashboard reads.
- Honor more-verbose ops levels (debug/trace) on the DB stream too.
- Keep the console stream at the exact ops level; `silent` stays silent.
- Engine-agnostic: JobLogStream writes via Prisma (job_logs), shared by honker (SQLite) and pg-boss (Postgres).
