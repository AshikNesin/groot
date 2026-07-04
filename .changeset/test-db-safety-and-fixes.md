---
"groot": minor
---

Port pending boilerplate improvements from downstream consumers:

- **Auto-provisioned test database.** `pnpm test` now provisions an isolated
  `${dbName}_test` database in the same Docker container as dev, applies
  migrations, and runs the suite against it (dev DB untouched). New
  `TEST_DATABASE_URL` (test-env only), `scripts/ensure-test-db.ts`,
  `scripts/get-test-db-connection-string.cjs`, `ensureTestDatabase()`, a
  `pretest` hook, and `test:db:start` / `test:db:reset` scripts. `test` now
  runs with `NODE_ENV=test` so varlock's `forEnv(test)` resolution activates.
- **Host-based test-DB safety guard.** `tests/server/_db-guard.ts`
  (`assertTestDatabase`) refuses to run unless the URL host is local AND the
  db name ends in `_test`, and hard-refuses known-prod hosts — so a
  misconfigured `TEST_DATABASE_URL` can never open a connection to a non-test
  database. Removed the orphaned duplicate `server/src/test/setup.ts`.
- **`dev.ts` auto-reset of stale `db push`-managed dev DB.** Detects a
  database with tables but no `_prisma_migrations` table and resets it before
  `migrate deploy`, fixing the P3005 failure on the `db push` → `migrate`
  transition.
- **`loadConfig()` accepts an optional schema parameter** so consumers can
  declare app-specific config sections without forking the synced schema.
- **`core/lib/api.ts` no longer rejects falsy response payloads** (`0`,
  `false`, `""`, `null`) — uses an `undefined` check instead of falsy.
- **`check-design-tokens.ts` bans `neutral`/`stone`** and uses an exact-path
  allowlist for the token layer.
