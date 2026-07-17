<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# AGENTS.md

This file onboards AI agents into the **groot** codebase — a production-ready
Express + React SaaS boilerplate. This is the single source of truth for agent
context; `CLAUDE.md` simply points back here.

## Project Overview (WHAT)

A full-stack TypeScript SaaS starter combining an Express.js backend with a
React frontend. Built with Prisma + SQLite (default) or PostgreSQL, a complete
UI component library, auth (JWT + Passkeys), background jobs, file storage, and
AI inference. Groot is also the **upstream boilerplate** that downstream repos
sync from via `pnpm groot:sync`.

## Tech Stack (WHAT)

| Area         | Technologies                                                          |
| ------------ | --------------------------------------------------------------------- |
| Backend      | Node.js, Express 5, TypeScript, Prisma, SQLite (default) / PostgreSQL |
| Auth         | JWT (bcryptjs), Passkeys (@simplewebauthn/server)                     |
| File Storage | AWS S3 SDK (@aws-sdk/client-s3)                                       |
| Jobs         | pg-boss (Postgres) / honker (SQLite) via a shared adapter             |
| KV Store     | Keyv (SQLite or PostgreSQL adapter)                                   |
| Logging      | Pino, Sentry (AsyncLocalStorage context)                              |
| Errors       | Boom (standardized HTTP errors)                                       |
| Frontend     | React 19, TypeScript, Vite 7, React Router 7, Zustand, React Query    |
| UI           | Radix UI primitives, Tailwind CSS, shadcn/ui patterns                 |
| Tooling      | Vite+ (Oxlint, Oxfmt), Vitest, Playwright, pnpm                       |
| AI           | @mariozechner/pi-ai (unified LLM API with Zod output)                 |

## Workspace Layout (WHAT)

Groot is a pnpm workspace with `packages/` (boilerplate, synced) and `apps/`
(app-owned, not synced):

```
apps/web/                   # App-owned — NOT synced
  src/client/               # React app (App.tsx, main.tsx, app/ business features)
  src/server/               # Express app (index.ts, routes.ts, app/ business modules)
  index.html                # Vite entry
  tsconfig.json             # Client tsconfig
packages/                   # Boilerplate — always synced
  ui/         @groot/ui     # shadcn/ui primitives (button, dialog, input, ...)
  shell/      @groot/shell # Client infrastructure (Layout, apiClient, stores, hooks)
  core/       @groot/core # Server infrastructure + reusable features + database
  jobs/       @groot/jobs # job queue (pg-boss/honker adapter) + dashboard (server/ + client/)
apps/web/prisma/            # schema.{sqlite,postgres}.prisma + migrations — app-owned
tests/                      # Centralized unit tests (mirror packages/ structure)
docs/                       # Documentation
.groot/                     # Boilerplate sync tooling (sync.ts, resolve.ts, upstream.ts, lib/)
```

### Package Dependency Rules

```
apps/web → @groot/ui, @groot/shell, @groot/core, @groot/core/database, @groot/jobs
@groot/shell → @groot/ui
@groot/core → @groot/core/database
@groot/jobs → @groot/core, @groot/shell, @groot/ui
```

**Key rule:** packages never import from `apps/`. Apps import from packages.

## Frontend Layering (HOW)

| Layer                 | Import path            | Purpose                  | Synced? |
| --------------------- | ---------------------- | ------------------------ | ------- |
| `@groot/ui`           | `@groot/ui/button`     | Design system primitives | Yes     |
| `@groot/shell`        | `@groot/shell/lib/api` | Boilerplate infra        | Yes     |
| `apps/web/.../pages/` | `./pages/todo/Todos`   | Business features        | No      |

**Dependency rule:** `ui/` cannot import `shell`/`pages`. `shell` cannot
import `pages/`. `pages/` imports both.

## Backend Feature Module (HOW)

Each feature in `apps/web/src/server/api/<feature>/` is self-contained:

- `*.routes.ts` — route defs via `createRouter()` with inline async request handlers
- `*.service.ts` — business logic (calls Prisma directly)
- `*.validation.ts` — Zod schemas
- `*.jobs.ts` — background job handlers (if applicable)

**Request flow:** Route handler (parse + validate + call service) →
Service (business logic + Prisma) → response auto-serialized by `handle` middleware.

**Server imports:** `@groot/core/*` for both infrastructure (errors, kv, ai, middlewares, utils, config) and reusable features (auth, passkey, settings, storage). Background jobs live in `@groot/jobs/server/*`.

## Database (HOW)

The Prisma client lives in `@groot/core/database`. The database engine is
selected by `DATABASE_ENGINE` — `sqlite` (default) or `postgres`. Two schema
files are maintained in parity: `apps/web/prisma/schema.sqlite.prisma` and
`apps/web/prisma/schema.postgres.prisma` (a unit test guards they stay in sync).
The active schema is chosen by `prisma.config.ts`. The generator output path
points to `packages/core/generated/prisma` (gitignored, regenerated by
`pnpm prisma generate`). **Switching engines requires regenerating the client**
— the generated client embeds the datasource provider, so a client generated
for sqlite is incompatible with the postgres driver adapter at runtime (and
vice versa). `pnpm dev` / `pnpm test` regenerate for the active engine.

See `docs/database-engines.md` for the full engine matrix (driver adapter, KV
backend, job queue adapter) and the `Json` parity strategy.

Import the singleton directly from `@groot/core/database`.

Only `packages/core/src/database/client.ts` should create the Prisma client
instance.

## Common Commands (HOW)

```bash
pnpm dev              # Dev server (Express + Vite middleware)
pnpm build            # Build client (Vite) + server (esbuild → dist/bundle.js)
pnpm start            # Run production build
pnpm test             # Vitest unit tests
pnpm test:sqlite      # Run tests on SQLite (default engine)
pnpm test:postgres    # Run tests on PostgreSQL
pnpm test:all         # Run tests on both engines
pnpm test:e2e         # Playwright E2E tests
pnpm check            # Lint + format (Vite+)
pnpm prisma generate  # Generate Prisma client (for the active DATABASE_ENGINE)
pnpm db:migrate        # Apply pending migrations (migrate deploy)
pnpm groot:check      # Dry-run boilerplate sync
pnpm groot:sync       # Apply safe boilerplate changes
```

## Conventions (HOW)

- **TypeScript strict**.
- **Frontend imports**: `@groot/ui/*`, `@groot/shell/*`, relative `./pages/*`.
- **Server imports**: `@groot/core/*`, `@groot/jobs/server/*`, relative `./api/*`.
- **Frontend data hooks**: use `apiClient` from `@groot/shell/lib/api` (not raw axios).
- **Routes**: `createRouter()` with inline async handlers; **services**: business logic calling Prisma directly.
- **Errors**: `Boom` factory methods from `@groot/core/errors`.
- **Database migrations**: never use `prisma db push` for schema changes. Use `pnpm db:migrate:create` to generate a migration, then `pnpm prisma migrate dev` to apply locally; deploys auto-run `pnpm db:migrate` (migrate deploy) via the `prestart` hook.
- **Validation**: Zod via `parseBody(req, schema)` / `parseQuery(req, schema)` / `parseParams(req, schema)` inside route handlers.
- **Exports**: prefer named exports (use `* as` for services).
- **Async**: always async/await, never raw Promises.
- **Naming**: camelCase vars/fns, PascalCase components/types.

## Environment

See `.env.schema` for the authoritative list of environment variables (core,
auth, S3, job queue, monitoring, passkeys, AI provider keys).

## Where to Look Next

- `docs/architecture.md` — full architecture doc with dependency diagrams
- `apps/web/prisma/schema.sqlite.prisma` / `schema.postgres.prisma` — data models (engine-specific; kept in parity by a test)
- `apps/web/src/server/routes.ts` — API surface
- `docs/setup-guide.md` — setup
- Existing feature modules under `apps/web/src/server/api/` and `apps/web/src/client/pages/` —
  follow established patterns before creating new ones.
