<div align="center">

# Groot

**A minimal, reliable Express + React + Prisma boilerplate.**

No framework churn. No over-abstraction. SQLite (default) or PostgreSQL, wired
so you can ship.

<p>
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node-18+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/pnpm-pnpm?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm" />
</p>

</div>

---

groot ships JWT + Passkey auth, background jobs, S3 file storage, AI inference,
and a full UI component library — all on a server-primary monolith you can
deploy as a single process.

## Quick start

```bash
cp .env.schema .env        # working dev defaults; configure secrets for prod
pnpm install
pnpm db:migrate            # apply baseline + pending migrations
pnpm dev                   # https://groot.localhost via portless
```

The first `pnpm dev` prompts you to trust a local HTTPS certificate (portless).
See [Portless & HTTPS](./docs/guides/portless-https.md) for details.

→ **[Full setup guide](./docs/setup-guide.md)** • **[Quick start](./docs/quick-start.md)**

## Tech stack

| Layer   | Technology                                                       |
| ------- | ---------------------------------------------------------------- |
| Server  | Express 5, TypeScript, Prisma 7, pg-boss / honker, Pino, Sentry  |
| Client  | React 19, Vite 7, React Router 7, React Query, Zustand, Tailwind |
| Auth    | JWT + Passkeys (WebAuthn)                                        |
| Storage | AWS S3                                                           |
| AI      | [`@earendil-works/pi-ai`](https://github.com/earendil-works/pi)  |
| Tooling | Vite+ (Oxlint, Oxfmt), Vitest, Playwright, pnpm                  |

## How it works

A **server-primary monolith**: one deployable process (`node dist/bundle.js`)
that also serves the built client as static assets.

```
Request → Express (apps/web/src/server)
             │
             ├─→ middlewares (logging, JWT, rate-limit, error)
             ├─→ createRouter (auto-wraps async handlers)
             ├─→ route handler (returns a value → auto-serialized)
             └─→ service (business logic) → Prisma → SQLite / PostgreSQL

Background jobs:
  feature.jobs.ts → registerJobHandler() → worker → adapter (pg-boss / honker)
```

### Workspace layout

A pnpm workspace. `packages/` is boilerplate (synced to child projects);
`apps/` is app-owned (not synced).

```
apps/web/                  # App-owned — NOT synced
  src/client/              # React app (App.tsx, pages/)
  src/server/              # Express app (index.ts, routes.ts, api/<feature>/)
  prisma/                  # schema.{sqlite,postgres}.prisma + migrations

packages/                  # Boilerplate — always synced
  ui/        @groot/ui      # shadcn/ui primitives (button, dialog, input, …)
  shell/     @groot/shell   # client infra (Layout, apiClient, stores, hooks)
  core/      @groot/core    # server infra + reusable features + database
  jobs/      @groot/jobs    # job queue adapter + dashboard (server/ + client/)
```

**Dependency rule:** `packages/` never imports from `apps/`. `apps/` imports
from `packages/`.

Backend-owned files (`prisma/`, `config.yml`, `Procfile`, `tsconfig.json`,
`vite.config.ts`) live at the repo root because that's where their tooling
expects them — see [Architecture](./docs/guides/architecture.md) for why.

## What's included

- **JWT + Passkey auth** with protected routes
- **Background jobs** — pg-boss (Postgres) or honker (SQLite), behind one adapter
- **S3 file storage** with uploads, downloads, folders, renames
- **AI inference** with Zod structured output
- **Key-value store** (Keyv — SQLite or Postgres backend)
- **UI component library** (Radix + Tailwind)
- **Request logging, error tracking (Sentry), rate limiting**
- **Pre-commit hooks** with secret detection (gitleaks)

## Scripts

| Command           | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `pnpm dev`        | Dev server (Express + Vite, HTTPS via portless) |
| `pnpm build`      | Build client (Vite) + bundle server (esbuild)   |
| `pnpm start`      | Run the production build                        |
| `pnpm check`      | Lint + format (Vite+)                           |
| `pnpm test`       | Vitest unit tests (SQLite by default)           |
| `pnpm test:e2e`   | Playwright E2E tests                            |
| `pnpm test:all`   | Run tests on both SQLite and PostgreSQL         |
| `pnpm db:migrate` | Apply pending migrations                        |

## Documentation

| Topic                | Document                                                                               |
| -------------------- | -------------------------------------------------------------------------------------- |
| Quick start          | [`docs/quick-start.md`](./docs/quick-start.md)                                         |
| Setup guide          | [`docs/setup-guide.md`](./docs/setup-guide.md)                                         |
| Architecture         | [`docs/guides/architecture.md`](./docs/guides/architecture.md)                         |
| Development workflow | [`docs/guides/development.md`](./docs/guides/development.md)                           |
| Database engines     | [`docs/database-engines.md`](./docs/database-engines.md)                               |
| Database migrations  | [`docs/guides/database-migrations.md`](./docs/guides/database-migrations.md)           |
| Testing              | [`docs/guides/testing.md`](./docs/guides/testing.md)                                   |
| Portless & HTTPS     | [`docs/guides/portless-https.md`](./docs/guides/portless-https.md)                     |
| Background jobs      | [`docs/features/jobs.md`](./docs/features/jobs.md)                                     |
| File storage (S3)    | [`docs/features/storage.md`](./docs/features/storage.md)                               |
| Passkey auth         | [`docs/features/passkey-authentication.md`](./docs/features/passkey-authentication.md) |
| AI inference         | [`docs/features/ai-inference.md`](./docs/features/ai-inference.md)                     |
| API request recipes  | [`docs/examples/api-requests.md`](./docs/examples/api-requests.md)                     |
| All docs             | [`docs/README.md`](./docs/README.md)                                                   |

## License

MIT
