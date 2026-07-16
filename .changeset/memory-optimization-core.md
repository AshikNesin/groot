---
"@groot/core": patch
---

perf: reduce memory consumption across the stack

- **Connection pools**: Prisma now uses an explicit `pg.Pool` (`max=5` dev / `max=10` prod, `idleTimeoutMillis=30s`) instead of letting PrismaPg silently create an uncapped pool. KeyvPostgres pool capped at `max=2`. Combined with the PgBoss fix this cuts idle PostgreSQL connections from ~30 to ~6.
- **Logger**: removed the custom `serializeObject()` + `dayjs()` call from pino's `log` formatter. Every log line was running a 5-level deep recursive object traversal — pino already serialises objects natively, making this pure overhead.
- **Prisma query events**: `{ level: "query", emit: "event" }` is now only registered in development where the DB-query logger subscribes to it. In production the event listener overhead was paid on every query for nothing.
- **Body parser limits**: reduced `express.json` / `express.urlencoded` from `50mb` → `1mb`. The 50 MB limit caused `raw-body` to pre-allocate a 50 MB buffer for every incoming request regardless of payload size.
- **Compression**: added `threshold: 1024` so responses under 1 KB are sent uncompressed, avoiding wasteful CPU on tiny JSON payloads.
- **S3 adapter lazy-load**: `files-sdk/s3` (which eagerly imports all three `@aws-sdk/*` packages) is now dynamically imported only in production. In development the local-fs adapter is used and `@aws-sdk` never loads.
- **lodash.mergewith removed**: replaced with a 25-line native `mergeWith()` in `object.utils.ts`. The package was loaded at every boot solely for a one-time config merge.
- **`@sentry/profiling-node` removed**: was listed as a dependency but never imported anywhere in the codebase — pure dead weight.
