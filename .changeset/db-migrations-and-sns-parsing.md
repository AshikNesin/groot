---
"groot": minor
---

feat: pooled DB support, db:baseline recovery, and SNS body-parsing

Three production hardening changes, each closing a silent-failure gap:

- **Pooled database connections (`DATABASE_URL_DIRECT`)**: `prisma.config.ts`
  now routes the migrate/introspection engine at `DATABASE_URL_DIRECT` when set,
  falling back to `DATABASE_URL`. The migrate engine uses prepared statements
  and is incompatible with transaction-mode poolers (Supabase Supavisor /
  PgBouncer / RDS Proxy), which fail with "prepared statement already exists"
  or hang past platform boot timeouts. Declared in `.env.schema`; documented in
  `docs/guides/database-migrations.md`. Optional — no change for direct-Postgres
  deployments.

- **`pnpm db:baseline` recovery script**: one-shot, idempotent command that
  brings a drifted (`db push`-managed) database into the migrate workflow —
  diffs live DB → schema, applies additive SQL only (refuses DROP / RENAME /
  ALTER COLUMN), writes the SQL for review first, marks the baseline applied,
  and verifies. Usage: `pnpm db:baseline` / `pnpm db:baseline -- --dry-run`.

- **Restore `express.text()` + body-parser limits**: `core/server.ts` now
  registers `express.text({ type: "text/plain" })` and raises the JSON/urlencoded
  limits to 50mb. AWS SNS posts webhooks (SES inbound email, S3 events,
  CloudWatch alarms) as `Content-Type: text/plain` even when the body is JSON;
  `express.json()` skips them so `req.body` arrived as `{}` and handlers 400'd
  silently. Regression test added.
