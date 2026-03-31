# Groot

Starter kit for building web apps with a reliable, minimal tech stack.

No framework churn. No over-abstraction. Just Express + React + Postgres — wired together so you can ship.

## Tech Stack

| Layer   | What                                                            |
| ------- | --------------------------------------------------------------- |
| Server  | Express 5, TypeScript, Prisma, pg-boss, Pino                    |
| Client  | React 19, Vite 7, React Router 7, React Query, Zustand          |
| Auth    | JWT + Passkeys (WebAuthn)                                        |
| Tooling | Vite+ (Oxlint, Oxfmt, Vitest), Playwright, pnpm                 |

## Get Started

```bash
cp .env.schema .env         # configure secrets
pnpm install
pnpm prisma generate
pnpm prisma db push
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

```
server/src/
  controllers/  routes/  services/  middlewares/
  core/         models/  validations/  utils/

client/src/
  components/   pages/   lib/   store/   hooks/

docs/           prisma/
```

## Scripts

```bash
pnpm dev              # dev server (HTTPS via portless)
pnpm dev:localhost     # dev server (plain HTTP, no proxy)
pnpm build            # production build
pnpm start            # run production build
pnpm check            # lint + format + typecheck
pnpm test             # run tests
pnpm test:e2e         # playwright e2e tests
```

## Docs

| Topic | Link |
|---|---|
| Quick start | [docs/quick-start.md](./docs/quick-start.md) |
| Setup guide | [docs/setup-guide.md](./docs/setup-guide.md) |
| Architecture | [docs/guides/architecture.md](./docs/guides/architecture.md) |
| Development workflow | [docs/guides/development.md](./docs/guides/development.md) |
| Portless & HTTPS | [docs/guides/portless-https.md](./docs/guides/portless-https.md) |
| Database migrations | [docs/guides/database-migrations.md](./docs/guides/database-migrations.md) |
| Testing | [docs/guides/testing.md](./docs/guides/testing.md) |
| Background jobs | [docs/features/jobs.md](./docs/features/jobs.md) |
| File storage (S3) | [docs/features/storage.md](./docs/features/storage.md) |
| Passkey auth | [docs/features/passkey-authentication.md](./docs/features/passkey-authentication.md) |
| AI inference | [docs/features/ai-inference.md](./docs/features/ai-inference.md) |
| All docs | [docs/README.md](./docs/README.md) |

## License

MIT
