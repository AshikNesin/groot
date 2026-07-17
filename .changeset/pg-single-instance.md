---
"groot": patch
---

pin `pg` to a single workspace version so `@prisma/adapter-pg`'s `instanceof pg.Pool` check is robust

`@prisma/adapter-pg` declares `pg` as a regular (non-peer) dependency, so pnpm
is free to resolve a different `pg` instance for the adapter than the one
`@groot/core` builds pools with. `PrismaPg`'s constructor recognises a passed-in
pool via `pool instanceof pg.Pool` using its **own** `pg`. When the pool is built
from core's different `pg` copy, the check returns false, the entire `Pool`
object is misread as a `pg.PoolConfig`, its `connectionString` resolves to
`undefined`, and every query connects to `pg`'s default endpoint (socket / :5432)
instead of `DATABASE_URL` — surfacing as `ECONNREFUSED` while a raw `pg.Pool` to
the same URL succeeds.

This works today only by luck of lockfile deduplication; it regressed in a
downstream repo once its lockfile drifted and re-split `pg`. Adding `pg` to
`overrides` forces one version — and therefore one instance — across the whole
workspace, so the `instanceof` check always holds regardless of lockfile state.
Bump the override in lock-step with `@groot/core`'s declared `pg` range.
