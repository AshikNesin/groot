# Groot

Starter kit for building web apps with a reliable, minimal tech stack.

No framework churn. No over-abstraction. Just Express + React + Postgres — wired together so you can ship.

## Tech Stack

| Layer   | What                                                   |
| ------- | ------------------------------------------------------ |
| Server  | Express 5, TypeScript, Prisma, pg-boss, Pino           |
| Client  | React 19, Vite 7, React Router 7, React Query, Zustand |
| Auth    | JWT + Passkeys (WebAuthn)                              |
| Tooling | Vite+ (Oxlint, Oxfmt, Vitest), Playwright, pnpm        |

## Get Started

```bash
cp .env.schema .env         # configure secrets
pnpm install
pnpm prisma generate
pnpm db:migrate        # apply baseline + pending migrations
pnpm dev                    # https://<appname>.localhost via portless
```

→ **[Full setup guide](./docs/setup-guide.md)** • **[Quick start](./docs/quick-start.md)**

## What's Included

- JWT + Passkey auth with protected routes
- Background jobs via pg-boss
- S3 file storage with secure sharing
- AI inference with Zod structured output
- Key-value store (Keyv + Postgres)
- UI component library (Radix + Tailwind)
- Request logging, error tracking (Sentry), rate limiting
- Pre-commit hooks with secret detection

## Project Structure

This is a **server-primary monolith**: one deployable process (`node dist/bundle.js`) that also serves the built client as static assets. The repo root _is_ the backend app's home — backend-owned files at root aren't leaked out of `server/`, they live where their tools expect to find them.

```
├── server/src/              # Backend application code
│   ├── app/<feature>/        # Feature endpoints (per-feature thin shell)
│   ├── shared/<feature>/     # Feature modules: controller + routes +
│   │                         #   service + validation + model
│   ├── core/                 # Cross-cutting infra (config, errors, job,
│   │                         #   kv, logger, middlewares, storage, utils)
│   └── generated/prisma/     # Prisma Client output (generated, not hand-edited)
├── client/src/               # Frontend application code (Vite build)
│   ├── app/<feature>/{pages,hooks}/
│   ├── core/{components,hooks,lib,services,store,types}/
│   └── ui/                   # shadcn primitives, exported via the `@/ui` barrel
├── docs/
│
├── prisma/                   # Schema + migrations + seed  ─┐
├── prisma.config.ts          # Prisma CLI config            │  pinned to root
├── config.yml                # Operator config (like .env)  │  by their tooling /
├── Procfile                  # Deploy process definition   │  deploy expectations
├── tsconfig.json             # Server tsconfig             ─┘
└── vite.config.ts            # Client build config (root = Vite's CWD)
```

**Why backend files live at root, not in `server/`:**

- `prisma/` + `prisma.config.ts` — the Prisma CLI resolves schema/migration paths relative to CWD; `schema.prisma`'s `output: "../server/src/generated/prisma"` is relative to the schema file. Moving it breaks the CLI. The generated client _does_ land inside `server/src/generated/` — only the schema definition sits at root.
- `config.yml` — operator-facing per-environment config, read by `server/src/core/config/config.loader.ts` via `resolve(process.cwd(), "config.yml")`. Same role as `.env`: belongs where the person deploying expects it.
- `Procfile` — Railway/Heroku/nixpacks look for it at root.
- `tsconfig.json` / `vite.config.ts` — each build tool runs from repo root.

The asymmetry (server code at root **and** in `server/`; client code only in `client/`) mirrors the deployment asymmetry: the server is the process, the client is a static asset that process serves.

## Scripts

```bash
pnpm dev              # dev server (HTTPS via portless)
pnpm build            # production build
pnpm start            # run production build
pnpm check            # lint + format + typecheck
pnpm test             # run tests
pnpm test:e2e         # playwright e2e tests
pnpm docker:db        # manage Docker PostgreSQL (--stop/--reset/--status)
```

## Docs

| Topic                | Link                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------ |
| Quick start          | [docs/quick-start.md](./docs/quick-start.md)                                         |
| Setup guide          | [docs/setup-guide.md](./docs/setup-guide.md)                                         |
| Architecture         | [docs/guides/architecture.md](./docs/guides/architecture.md)                         |
| Development workflow | [docs/guides/development.md](./docs/guides/development.md)                           |
| Portless & HTTPS     | [docs/guides/portless-https.md](./docs/guides/portless-https.md)                     |
| Database migrations  | [docs/guides/database-migrations.md](./docs/guides/database-migrations.md)           |
| Testing              | [docs/guides/testing.md](./docs/guides/testing.md)                                   |
| Background jobs      | [docs/features/jobs.md](./docs/features/jobs.md)                                     |
| File storage (S3)    | [docs/features/storage.md](./docs/features/storage.md)                               |
| Passkey auth         | [docs/features/passkey-authentication.md](./docs/features/passkey-authentication.md) |
| AI inference         | [docs/features/ai-inference.md](./docs/features/ai-inference.md)                     |
| All docs             | [docs/README.md](./docs/README.md)                                                   |

## License

MIT
