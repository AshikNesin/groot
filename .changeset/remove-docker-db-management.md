---
"groot": minor
---

Remove local Docker PostgreSQL container management

The repo now defaults to SQLite (zero-infra local dev). The Docker-based
Postgres container automation (`scripts/lib/docker-db.ts`, the `docker:db`
CLI, the `LOCAL_DB_DOCKER_PORT` env var, and the connection-string helper
scripts) was rarely used and added maintenance surface, so it's been removed.

Postgres engine support is unchanged: `DATABASE_ENGINE=postgres` still works
locally and in CI — you now just bring your own Postgres and set `DATABASE_URL`
explicitly. `scripts/dev.ts` and `scripts/ensure-test-db.ts` no longer manage
a container; they migrate, seed, and start against whatever `DATABASE_URL` you
provide. The CI postgres matrix leg is unaffected (it already used a service
container).

**Migration:** if you relied on `pnpm docker:db` or the auto-started Docker
container for local Postgres dev, run your own Postgres and set `DATABASE_URL`
(and `DATABASE_ENGINE=postgres`) directly. SQLite users need do nothing.
