# Database Migrations Guide

This guide covers the Prisma migration-based deployment workflow for managing database schema changes.

> **Engine note:** The default database is **SQLite** (`DATABASE_ENGINE=sqlite`).
> Set `DATABASE_ENGINE=postgres` to use PostgreSQL. The schema is split into
> `schema.sqlite.prisma` / `schema.postgres.prisma`; migrations are shared.
> See [Database Engines](../database-engines.md) for the full matrix. The
> `DATABASE_URL_DIRECT` / pooler guidance later in this guide is
> PostgreSQL-specific.

## Overview

This project uses Prisma Migrate for database schema management. This approach:

- Generates SQL migration files from schema changes
- Tracks applied migrations in the `_prisma_migrations` table
- Ensures consistent schema state across environments
- Enables safe, version-controlled deployments

## Development Workflow

### Making Schema Changes

1. **Edit the Prisma schema**

   The schema is split by engine — edit **both** to keep them in parity (a unit
   test in `tests/server/prisma/schema-parity.test.ts` enforces this):

   ```bash
   # Edit both schema files
   vim apps/web/prisma/schema.sqlite.prisma
   vim apps/web/prisma/schema.postgres.prisma
   ```

   Use the `Json` type (not `String` + `JSON.stringify`) for array/JSON columns
   — it maps to native `JSONB` on Postgres and `TEXT` on SQLite, with identical
   generated client types. See [Database Engines](../database-engines.md).

2. **Create a migration**

   Generate a migration file without applying it:

   ```bash
   pnpm db:migrate:create --name <descriptive_name>
   ```

   Example:

   ```bash
   pnpm db:migrate:create --name add_user_avatar_url
   ```

3. **Review the generated SQL**

   Open the new migration file in `apps/web/prisma/migrations/<timestamp>_<name>/migration.sql` and verify the SQL looks correct.

4. **Apply locally**

   ```bash
   pnpm prisma migrate dev
   ```

   This applies the migration and regenerates the Prisma client.

### Quick Commands

| Task                           | Command                                |
| ------------------------------ | -------------------------------------- |
| Create migration (don't apply) | `pnpm db:migrate:create --name <name>` |
| Apply migrations locally       | `pnpm prisma migrate dev`              |
| View migration status          | `pnpm prisma migrate status`           |
| Reset database                 | `pnpm prisma migrate reset`            |

## Production Deployment

### Automatic Migrations

Migrations run automatically on deployment via the `prestart` script:

```json
{
  "prestart": "prisma migrate deploy"
}
```

When you push to main, Coolify runs `pnpm start`, which first executes `prestart` to apply any pending migrations.

### Manual Migration (if needed)

To run migrations manually in production:

```bash
# SSH into the container or use Coolify's terminal
pnpm db:migrate
```

## One-Time Production Setup

**After the first deployment** with the baseline migration, mark it as applied in production:

```bash
pnpm prisma migrate resolve --applied 20260315000000_baseline_user_models
```

This tells Prisma that the baseline migration has already been applied (since the tables already existed).

## Pooled Database Connections (Supabase / PgBouncer / RDS Proxy)

The Prisma **migrate/introspection engine** (used by `migrate deploy`, `migrate
status`, `migrate diff`, `db pull`) opens its own connection and relies on
prepared statements + session-level features. This is **incompatible with
transaction-mode poolers** — Supabase Supavisor (port 6543), PgBouncer in
transaction mode, RDS Proxy, Cloud SQL — and fails with:

```
Error: prepared statement "s1" already exists
```

and can hang long enough to trip platform boot timeouts (on Heroku this is a
guaranteed crash loop: `prestart` runs `migrate deploy`, it hangs past the 60s
R10 boot limit, the dyno is SIGKILL'd, every request 503s).

### The fix

`prisma.config.ts` routes the migrate engine at **`DATABASE_URL_DIRECT`** when
set, falling back to `DATABASE_URL`:

```ts
datasource: {
  url: ENV.DATABASE_URL_DIRECT || ENV.DATABASE_URL,
},
```

The **runtime client is unaffected** — it uses the pooled `DATABASE_URL`
separately via `@prisma/adapter-pg` in `packages/core/src/database.ts`.

### When you need it

| Environment                  | `DATABASE_URL_DIRECT`                              |
| ---------------------------- | -------------------------------------------------- |
| Local Postgres (dev)         | not needed (unset)                                 |
| Direct Postgres (Coolify)    | not needed (unset)                                 |
| Supabase / Supavisor pooled  | **set** — point at the session-mode port (`:5432`) |
| PgBouncer (transaction mode) | **set** — point past the pooler                    |

`DATABASE_URL_DIRECT` is optional and only needs to bypass the pooler. With it
set, `prestart` → `prisma migrate deploy` connects directly and boots cleanly.

### Manual migration check against a pooled DB

```bash
# Verify migrations apply cleanly via the direct connection:
export DATABASE_URL="$DATABASE_URL_DIRECT"; pnpm db:migrate
```

## Migration Best Practices

### DO

- Create descriptive migration names: `add_user_preferences`, not `update_schema`
- Review generated SQL before committing
- Test migrations locally before pushing
- Keep migrations small and focused
- Add rollback notes for complex migrations

### DON'T

- Edit applied migrations
- Delete migration files
- Skip reviewing generated SQL
- Use `prisma db push` for schema changes (it bypasses migration history and drifts dev from prod)

## Troubleshooting

### "Migration failed to apply"

1. Check the error in logs
2. Verify the database state matches expected schema
3. If needed, manually fix and mark as applied:
   ```bash
   pnpm prisma migrate resolve --applied <migration_name>
   ```

### "Drift detected"

The database schema differs from expected state:

1. Compare local and production schemas
2. Create a migration to reconcile differences
3. Or reset the database (development only):
   ```bash
   pnpm prisma migrate reset
   ```

If the database was previously managed with `prisma db push` (no
`_prisma_migrations` table, or rows that don't match the migrations folder),
bring it into the migrate workflow in one safe, idempotent step:

```bash
pnpm db:baseline            # diffs live DB → schema, applies additive SQL,
                            # marks the baseline applied, verifies
pnpm db:baseline -- --dry-run   # generate the SQL for review without applying
```

The script refuses to apply any non-additive SQL (DROP / RENAME / ALTER COLUMN)
and writes the generated SQL to `tmp/db-baseline-sync.sql` for review first.

### "No migrations to apply"

This is normal if:

- All migrations are already applied
- You're running after the baseline setup

### Development Database Issues

Reset the local database:

```bash
# With Docker PostgreSQL
pnpm docker:db -- --reset

# Or manually
pnpm prisma migrate reset
```

## Related Documentation

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Development Guide](./development.md)
- [Architecture Guide](./architecture.md)
