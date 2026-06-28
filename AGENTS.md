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
React frontend. Built with Prisma + PostgreSQL, a complete UI component
library, auth (JWT + Passkeys), background jobs, file storage, and AI
inference. Groot is also the **upstream boilerplate** that downstream repos
sync from via `pnpm groot:sync`.

## Tech Stack (WHAT)

| Area         | Technologies                                                       |
| ------------ | ------------------------------------------------------------------ |
| Backend      | Node.js, Express 5, TypeScript, Prisma, PostgreSQL                 |
| Auth         | JWT (bcryptjs), Passkeys (@simplewebauthn/server)                  |
| File Storage | AWS S3 SDK (@aws-sdk/client-s3)                                    |
| Jobs         | pg-boss (PostgreSQL-backed queue)                                  |
| KV Store     | Keyv with PostgreSQL adapter                                       |
| Logging      | Pino, Sentry (AsyncLocalStorage context)                           |
| Errors       | Boom (standardized HTTP errors)                                    |
| Frontend     | React 19, TypeScript, Vite 7, React Router 7, Zustand, React Query |
| UI           | Radix UI primitives, Tailwind CSS, shadcn/ui patterns              |
| Tooling      | Vite+ (Oxlint, Oxfmt), Vitest, Playwright, pnpm                    |
| AI           | @mariozechner/pi-ai (unified LLM API with Zod output)              |

## Key Directories (WHAT)

```
server/src/
├── app/        # App-specific feature modules (e.g. todo/) — NOT synced
├── shared/     # Reusable features: auth, passkey, jobs, storage, settings, ai
├── core/       # Core infrastructure: ai, errors, job, kv, logger, middlewares, storage, utils
├── routes.ts   # Central route registration
└── index.ts    # Server entry point

client/src/
├── ui/         # Pure shadcn/ui primitives (zero business logic) — synced
├── core/       # Boilerplate infrastructure (layouts, api client, stores) — synced
├── app/        # Business feature modules — NOT synced
├── App.tsx     # Route definitions
└── index.css   # Global styles / Tailwind

tests/          # Centralized unit tests (mirror server/src and client/src)
docs/           # Documentation
prisma/         # Database schema and migrations
.groot/         # Boilerplate sync tooling (sync.ts, upstream.ts, _acquire.ts)
```

## Frontend Layering (HOW)

| Layer   | Import path              | Purpose                  | Synced? |
| ------- | ------------------------ | ------------------------ | ------- |
| `ui/`   | `@/ui/button`            | Design system primitives | Yes     |
| `core/` | `@/core/lib/api`         | Boilerplate infra        | Yes     |
| `app/`  | `@/app/todo/pages/Todos` | Business features        | No      |

**Dependency rule:** `ui/` ↛ `core`/`app`. `core/` ↛ `app/`. `app/` → both.

## Backend Feature Module (HOW)

Each feature in `server/src/app/<feature>/` is self-contained:

- `*.routes.ts` — route defs via `createRouter()`
- `*.controller.ts` — async request handlers (return values, auto-serialized)
- `*.service.ts` — business logic
- `*.validation.ts` — Zod schemas
- `*.model.ts` — Prisma queries
- `*.jobs.ts` — background job handlers (if applicable)
- `index.ts` — feature exports

**Request flow:** Route (`createRouter` + validation) → Controller (async fn) →
Service → Prisma. Responses auto-serialized by the handle middleware.

## Common Commands (HOW)

```bash
pnpm dev              # Dev server (Express + Vite middleware)
pnpm build            # Build client (Vite) + server (esbuild → dist/bundle.js)
pnpm start            # Run production build
pnpm test             # Vitest unit tests
pnpm test:e2e         # Playwright E2E tests
pnpm check            # Lint + format (Vite+)
pnpm prisma generate  # Generate Prisma client
pnpm db:migrate        # Apply pending migrations (migrate deploy)
pnpm groot:check      # Dry-run boilerplate sync
pnpm groot:sync       # Apply safe boilerplate changes
```

## Conventions (HOW)

- **TypeScript strict**; use `@/` alias (→ `server/src/` or `client/src/`).
- **Frontend imports**: `@/ui/*`, `@/core/*`, `@/app/*`.
- **Frontend data hooks**: use `apiClient` from `@/core/lib/api` (not raw axios).
- **Routes**: `createRouter()`; **controllers**: simple async fns.
- **Errors**: `Boom` factory methods from `@/core/errors`.
- **Database migrations**: never use `prisma db push` for schema changes. Use `pnpm db:migrate:create` to generate a migration, then `pnpm prisma migrate dev` to apply locally; deploys auto-run `pnpm db:migrate` (migrate deploy) via the `prestart` hook. `db push` writes nothing to `prisma/migrations/` and silently drifts dev from prod.
- **Validation**: Zod via `validate(schema, "body"|"params"|"query")`; read `req.validated.*`.
- **Exports**: prefer named exports (use `* as` for controllers).
- **Async**: always async/await, never raw Promises.
- **Naming**: camelCase vars/fns, PascalCase components/types.

## Environment

See `.env.schema` for the authoritative list of environment variables (core,
auth, S3, job queue, monitoring, passkeys, AI provider keys).

## Where to Look Next

- `prisma/schema.prisma` — data models
- `server/src/routes.ts` — API surface
- `docs/setup-guide.md` — setup
- Existing feature modules under `server/src/app/` and `client/src/app/` —
  follow established patterns before creating new ones.
