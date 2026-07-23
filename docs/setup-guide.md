# Setup guide

Everything you need to boot the Express API, job queue, and React client —
locally and in production.

## Prerequisites

- **Node.js 18+**
- **pnpm** (the repo's scripts assume pnpm)
- **portless** (install globally: `npm install -g portless`) — provides local
  HTTPS. See [Portless & HTTPS](./guides/portless-https.md).
- **SQLite** (default engine): nothing to install — `better-sqlite3` ships a
  prebuilt native binary.
- **PostgreSQL** (optional): a reachable instance via `DATABASE_URL`. Opt in
  with `DATABASE_ENGINE=postgres` — see [Database Engines](./database-engines.md).

## Quick setup

### Automated (recommended)

```bash
pnpm groot:setup
```

This installs the global CLIs (varlock, portless), sets up git hooks
(lint-staged + gitleaks via Vite+), prompts for your app name and propagates it
to `config.yml`, `package.json`, and `.env.schema`, then installs deps and
generates the Prisma client.

Secrets are managed via **varlock + Doppler** — no local `.env` editing needed
in development (varlock provides working defaults from `.env.schema`).

### Manual

Copy `.env.schema` to `.env` and configure the keys below (validated in
`packages/core/src/env.ts`).

#### Core

| Variable          | Description                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`        | `development`, `production`, or `test`                                                                                                         |
| `PORT`            | HTTP port for Express (default `3000`; set automatically by hosts like Coolify)                                                                |
| `DATABASE_ENGINE` | `sqlite` (default) or `postgres`. Selects the Prisma driver adapter, KV backend, and job queue. See [Database Engines](./database-engines.md). |
| `DATABASE_URL`    | SQLite file path (e.g. `file:./data/dev.db`) or a Postgres connection string, depending on `DATABASE_ENGINE`. Used by Prisma, KV, and jobs.    |
| `DOPPLER_TOKEN`   | (Production) varlock uses this to fetch secrets from Doppler. Optional in dev.                                                                 |

#### Authentication

| Variable         | Description                                           |
| ---------------- | ----------------------------------------------------- |
| `JWT_SECRET_KEY` | Secret for signing JWT tokens (min 32 characters)     |
| `ADMIN_AUTH_KEY` | Key for admin-only routes (`X-Admin-Auth-Key` header) |

> Auth is **JWT-based**. There is no basic-auth layer. See
> [Client auth](./features/client.md) for the request flow.

#### Passkey (WebAuthn)

Passkey settings live in **`config.yml`** (`passkey:` section), not env vars:

```yaml
passkey:
  rpName: "Groot" # shown in passkey prompts
  rpId: "localhost" # Relying Party ID (your domain in prod)
  origin: "https://groot.localhost" # full origin URL
```

See [Passkey authentication](./features/passkey-authentication.md) and
[Config](./config.md).

#### File storage (S3)

| Variable                | Description                      |
| ----------------------- | -------------------------------- |
| `AWS_ACCESS_KEY_ID`     | AWS access key for S3            |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for S3            |
| `AWS_REGION`            | AWS region (default `us-east-1`) |
| `AWS_DEFAULT_S3_BUCKET` | S3 bucket name for file storage  |

In dev/test a local mock is used; the `AWS_*` values are still required
(anything that reads the bucket name directly).

#### Monitoring

| Variable            | Description                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `SENTRY_DSN`        | Optional URL for capturing backend errors in Sentry                                         |
| `SENTRY_RELEASE`    | Release version for Sentry (optional)                                                       |
| `SENTRY_AUTH_TOKEN` | Build-time token for source map uploads (see [Sentry source maps](./sentry-source-maps.md)) |
| `LOG_LEVEL`         | Verbosity: `trace`/`debug`/`info`/`warn`/`error` (default `info`)                           |

> **Job queue settings live in `config.yml`** (`jobs:` section), not env vars.
> See [Config](./config.md).

## Local development

```bash
pnpm install
pnpm db:migrate          # apply baseline + pending migrations
pnpm dev                 # Express + Vite dev middleware, over HTTPS
```

- Visit **`https://groot.localhost`** for the client (portless provides HTTPS).
- Hit **`https://groot.localhost/health`** (no auth) to confirm the API is live.
- To bypass portless and use plain HTTP: `PORTLESS=0 pnpm dev` → `http://localhost:3000`.

> **First run?** portless will prompt you to trust a local CA certificate
> (requires sudo). See [Portless & HTTPS](./guides/portless-https.md).

## Production build

```bash
pnpm build        # builds the client (Vite) and bundles the server (esbuild)
pnpm start        # serves dist/bundle.js with NODE_ENV=production
```

In production the server:

- Serves the prebuilt client from `dist/`.
- Enables gzip via `compression`.
- Boots the job queue (`initJobQueue()` + `startWorkers()`) when the HTTP
  listener starts. On SQLite the queue runs on
  [honker](https://github.com/russellromney/honker); on Postgres on
  [pg-boss](https://github.com/timgit/pg-boss) — see
  [Database Engines](./database-engines.md).
- Runs `prisma migrate deploy` via the `prestart` hook on startup.

## Database & Prisma

- The engine defaults to **SQLite** (`DATABASE_ENGINE=sqlite`); set
  `DATABASE_ENGINE=postgres` for PostgreSQL. See
  [Database Engines](./database-engines.md) for the full matrix.
- The Prisma client is generated automatically via `pnpm install` (`postinstall`
  runs `prisma generate`). The generated client embeds the datasource provider,
  so **switching engines requires regenerating the client** (`pnpm prisma
generate`, or any `pnpm dev`/`pnpm test`).
- Two schema files are kept in parity: `apps/web/prisma/schema.sqlite.prisma`
  and `apps/web/prisma/schema.postgres.prisma` (a test guards they stay in sync).
- To evolve the schema: `pnpm db:migrate:create` (then `pnpm prisma migrate dev`
  to apply). See [Database migrations](./guides/database-migrations.md).
- The generated client (in `packages/core/generated/prisma`) feeds both HTTP
  handlers and job processors.

## Background job queue

- Configuration comes from `config.yml` (`jobs:` section) — see
  [Config](./config.md).
- Workers register when `startWorkers()` runs in `apps/web/src/server/index.ts`.
- The adapter is chosen by `DATABASE_ENGINE`: pg-boss on Postgres, honker on
  SQLite. Application code is engine-agnostic — handlers receive a normalized
  `JobContext`.
- On Postgres, ensure your role can create the `pgboss` schema (pg-boss
  bootstraps its tables at startup). On SQLite, honker creates its `_honker_*`
  tables lazily after Prisma migrates.

See [Background jobs](./features/jobs.md) for the full API.

## Verify the stack

```bash
curl https://groot.localhost/health
# then log in and use the token:
TOKEN=$(curl -s -X POST https://groot.localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' | jq -r .token)
curl -H "Authorization: Bearer $TOKEN" https://groot.localhost/api/v1/todos
curl -H "Authorization: Bearer $TOKEN" -X POST https://groot.localhost/api/v1/jobs \
  -H "Content-Type: application/json" -d '{"jobName":"todo-summary","data":{}}'
```

Successful responses confirm Express, Prisma, the job queue, and the JWT guard
are all working.
