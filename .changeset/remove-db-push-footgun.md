---
"groot": patch
---

fix(db): remove the prisma:push footgun — migrate is the only schema path

Removes the `prisma:push` (`prisma db push`) script and switches the local dev
DB bootstrap to `prisma migrate deploy`, so `db push` is no longer the default,
most discoverable way to apply schema changes.

`db push` bypasses the migration history entirely: it syncs the schema to one
database but writes nothing to `prisma/migrations/` and never touches
`_prisma_migrations`. The result is silent divergence — dev has the new schema,
the migrations folder is stale, and production (which runs `migrate deploy` via
the `prestart` hook) never sees the change. This is exactly what caused the
production login outage in a downstream consumer: a schema refactor added
`User.name`/`User.updatedAt`, `db push` updated dev, no migration was created,
and prod's `findUnique()` hit `P2022: Database column does not exist`.

Changes:

- `package.json`: remove `prisma:push`. `db push` remains reachable via the raw
  passthrough (`pnpm prisma db push`) for rare legitimate cases (throwaway
  prototyping), but it is no longer a one-word npm script a developer types by
  reflex.
- `scripts/dev.ts`: bootstrap the local DB via `prisma migrate deploy` instead
  of `prisma db push --accept-data-loss`, so a fresh dev DB is byte-identical
  to what `prestart` produces in production.
- `AGENTS.md`: add a "never use `prisma db push`" rule to the Conventions
  section (the process backstop), and update the commands list.
- `docs/guides/database-migrations.md`: strengthen the DON'T rule from "in
  production" to "for schema changes (bypasses migration history)".
- README, quick-start, setup-guide, development.md, passkey docs: replace
  stale `pnpm prisma:push` / `npx prisma db push` instructions with the
  migrate equivalents.

Verified: `prisma migrate deploy` against a fresh database created the baseline
tables with correct `_prisma_migrations` tracking.
