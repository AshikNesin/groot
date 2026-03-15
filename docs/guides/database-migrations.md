# Database Migrations Guide

This guide covers the Prisma migration-based deployment workflow for managing database schema changes.

## Overview

This project uses Prisma Migrate for database schema management. This approach:

- Generates SQL migration files from schema changes
- Tracks applied migrations in the `_prisma_migrations` table
- Ensures consistent schema state across environments
- Enables safe, version-controlled deployments

## Development Workflow

### Making Schema Changes

1. **Edit the Prisma schema**

   Modify `prisma/schema.prisma` with your changes:

   ```bash
   # Edit the schema file
   vim prisma/schema.prisma
   ```

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

   Open the new migration file in `prisma/migrations/<timestamp>_<name>/migration.sql` and verify the SQL looks correct.

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
| Open Prisma Studio             | `pnpm dev:studio`                      |

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
- Use `prisma db push` in production

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

### "No migrations to apply"

This is normal if:

- All migrations are already applied
- You're running after the baseline setup

### Development Database Issues

Reset the local database:

```bash
# With Docker PostgreSQL
pnpm dev:db:docker:reset

# Or manually
pnpm prisma migrate reset
```

## Related Documentation

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Development Guide](./development.md)
- [Architecture Guide](./architecture.md)
