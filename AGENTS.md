# groot agent index

Use **pnpm** for everything: installs (`pnpm install`), scripts, and tests.
Do **not** call `vp` directly — it's wrapped by pnpm scripts (`pnpm check`,
`pnpm test`, `pnpm build`). Do not use npm or yarn.

This file is intentionally brief. Detailed guidance lives in `docs/` — start at
[`docs/README.md`](./docs/README.md).

## Non-negotiable rules

- **Packages never import from `apps/`.** Dependency direction is one-way:
  `@groot/ui` → `@groot/shell` → `apps/web/.../pages/`. Apps import packages,
  never the reverse.
- **Schema changes are Prisma-only.** Never hand-write SQL or run `prisma db
push`. Use `pnpm db:migrate:create` → `pnpm prisma migrate dev`, and edit
  **both** `schema.sqlite.prisma` and `schema.postgres.prisma` (a unit test
  enforces parity).
- **Only `packages/core/src/database/client.ts` may create the Prisma client.**
  Import the singleton from `@groot/core/database`.
- **Switching `DATABASE_ENGINE` requires regenerating the client** (`pnpm prisma
generate`) — the generated client embeds the datasource provider.

## Everyday commands

`pnpm dev` · `pnpm test` · `pnpm check` · `pnpm build` · `pnpm db:migrate` ·
`pnpm groot:sync` (apply boilerplate updates) · `pnpm groot:check` (dry run)

## Where to look

- Architecture & request flow: [`docs/guides/architecture.md`](./docs/guides/architecture.md)
- Commands & conventions: [`docs/guides/development.md`](./docs/guides/development.md)
- Migrations: [`docs/guides/database-migrations.md`](./docs/guides/database-migrations.md)
- Testing: [`docs/guides/testing.md`](./docs/guides/testing.md)
- Database engines (SQLite/Postgres matrix): [`docs/database-engines.md`](./docs/database-engines.md)
- Feature modules (reference): [`docs/features/todos.md`](./docs/features/todos.md)
- Syncing downstream projects: [`docs/sync-guide.md`](./docs/sync-guide.md)
- Env vars & setup: [`docs/setup-guide.md`](./docs/setup-guide.md), [`.env.schema`](./.env.schema)
