# Setup Guide

Follow these steps to boot the Express API, job queue, and React client locally or in production.

## Prerequisites

- Node.js 18+
- pnpm (the repo is configured for pnpm scripts)
- portless (Install globally: `npm install -g portless`) — see [Portless & HTTPS Guide](./guides/portless-https.md)
- **SQLite** (default engine): nothing to install — [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) ships a prebuilt native binary.
- **PostgreSQL** (optional): a PostgreSQL instance reachable via `DATABASE_URL` — see [Database Engines](./database-engines.md) for how to opt in via `DATABASE_ENGINE=postgres`.
- OpenSSL or another tool for generating basic auth credentials

## Quick Setup

### Automated Setup (Recommended)

Run the setup script to configure your project:

```bash
pnpm groot:setup
```

This script will:

- Install global CLIs (varlock, portless)
- Set up git hooks (lint-staged + gitleaks via Vite+)
- Prompt for your app name and update `config.yml`, `package.json`, and `.env.schema` (Doppler project)
- Install dependencies and generate the Prisma client

Secrets are managed via varlock + Doppler — no local `.env` file needed in development.

### Manual Setup

Copy `.env.schema` to `.env` and populate these keys (validated in `packages/core/src/env.ts`):

| Variable                                      | Description                                                                                                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                    | `development`, `production`, or `test`                                                                                                                           |
| `PORT`                                        | HTTP port for Express (default `3000`)                                                                                                                           |
| `DATABASE_ENGINE`                             | `sqlite` (default) or `postgres`. Selects the Prisma driver adapter, the KV backend, and the job queue. See [Database Engines](./database-engines.md).           |
| `DATABASE_URL`                                | SQLite file path (e.g. `file:./data/dev.db`) or a PostgreSQL connection string, depending on `DATABASE_ENGINE`. Used by Prisma, the KV store, and the job queue. |
| `BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD` | Credentials enforced by `basicAuthMiddleware` for all `/api/v1` routes                                                                                           |

### Authentication Variables

| Variable         | Description                                           |
| ---------------- | ----------------------------------------------------- |
| `JWT_SECRET_KEY` | Secret key for signing JWT tokens (min 32 characters) |
| `ADMIN_AUTH_KEY` | Key for admin-only routes (X-Admin-Auth-Key header)   |

### Passkey (WebAuthn) Variables

| Variable    | Description                                                        |
| ----------- | ------------------------------------------------------------------ |
| `RP_ID`     | Relying Party ID (e.g., `localhost` for dev, your domain for prod) |
| `RP_NAME`   | Display name for passkey prompts                                   |
| `RP_ORIGIN` | Full origin URL (e.g., `https://groot.localhost`)                  |

### File Storage (S3) Variables

| Variable                | Description                       |
| ----------------------- | --------------------------------- |
| `AWS_ACCESS_KEY_ID`     | AWS access key for S3             |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for S3             |
| `AWS_REGION`            | AWS region (default: `us-east-1`) |
| `AWS_DEFAULT_S3_BUCKET` | S3 bucket name for file storage   |

### Job Queue Variables

| Variable                              | Description                                                 |
| ------------------------------------- | ----------------------------------------------------------- |
| `ENABLE_JOB_QUEUE`                    | Enable/disable job processing (default: `true`)             |
| `JOB_CONCURRENCY`                     | Number of workers registered per job (default `5`)          |
| `JOB_POLL_INTERVAL`                   | Worker polling interval in milliseconds (default `2000`)    |
| `JOB_ARCHIVE_COMPLETED_AFTER_SECONDS` | Archive window (pg-boss only; default `86400`)              |
| `JOB_DELETE_ARCHIVED_AFTER_SECONDS`   | Deletion window (pg-boss only; default `604800`)            |
| `JOB_MONITOR_STATE_INTERVAL`          | Interval for emitting queue state metrics (default `30000`) |

### Monitoring Variables

| Variable         | Description                                                                    |
| ---------------- | ------------------------------------------------------------------------------ |
| `SENTRY_DSN`     | Optional URL for capturing backend errors in Sentry                            |
| `SENTRY_RELEASE` | Release version for Sentry (optional)                                          |
| `LOG_LEVEL`      | Logging verbosity: `trace`, `debug`, `info`, `warn`, `error` (default: `info`) |

## Local Development

```bash
pnpm install
pnpm db:migrate          # apply baseline + pending migrations
pnpm dev                  # runs server + Vite dev middleware
```

> **First time?** On first `pnpm dev`, portless will prompt you to trust a local CA certificate (requires sudo). See [Portless & HTTPS Guide](./guides/portless-https.md) for details.

- Visit `https://groot.localhost` for the client (portless provides HTTPS automatically).
- Hit `https://groot.localhost/health` without auth to confirm the API is live.
- Interact with `/api/v1/todos` or `/api/v1/jobs` using basic auth headers (`Authorization: Basic base64(username:password)`).
- To bypass portless and use plain HTTP, run: `PORTLESS=0 pnpm dev` (server will be available at `http://localhost:3000`)

## Production Build

```bash
pnpm build        # Builds client (Vite) and bundles server (scripts/build.mjs)
pnpm start        # Serves dist/bundle.js with NODE_ENV=production
```

In production mode the server:

- Serves the prebuilt client from `dist/`
- Enables gzip via `compression`
- Boots the job queue (`initJobQueue()` + `startWorkers()`) immediately when the HTTP listener starts. On SQLite the queue runs on [honker](https://github.com/russellromney/honker); on Postgres on [pg-boss](https://github.com/timgit/pg-boss) — see [Database Engines](./database-engines.md).

## Database & Prisma

- The database engine defaults to **SQLite** (`DATABASE_ENGINE=sqlite`); set `DATABASE_ENGINE=postgres` to use PostgreSQL. See [Database Engines](./database-engines.md) for the full matrix (driver adapter, KV backend, job queue).
- Prisma client is generated automatically via `pnpm install` (`postinstall` runs `prisma generate`). The generated client embeds the datasource provider, so **switching engines requires regenerating the client** — `pnpm prisma generate` (or any `pnpm dev` / `pnpm test`, which regenerate for the active engine).
- Two schema files are maintained in parity: `apps/web/prisma/schema.sqlite.prisma` and `apps/web/prisma/schema.postgres.prisma` (a test guards they stay in sync).
- To re-sync schema changes: `pnpm db:migrate:create` (then `pnpm prisma migrate dev` to apply locally).
- The Prisma client emitted into `packages/core/generated/prisma` feeds both HTTP handlers and job processors.

## Background Job Queue

- Configuration comes from `core/job/config.ts` (or `config.yml` `jobs:`).
- Workers register when `startWorkers()` runs inside `apps/web/src/server/index.ts`.
- The queue adapter is chosen by `DATABASE_ENGINE`: pg-boss on Postgres, honker on SQLite. Application code is engine-agnostic — handlers receive a normalized `JobContext`.
- On Postgres, ensure your role can create the `pgboss` schema; pg-boss bootstraps its tables at startup. On SQLite, honker creates its `_honker_*` tables lazily after Prisma migrates.

## Verifying the Stack

1. `curl https://groot.localhost/health`
2. `curl -u username:password https://groot.localhost/api/v1/todos`
3. `curl -u username:password -X POST https://groot.localhost/api/v1/jobs -H 'Content-Type: application/json' -d '{"jobName":"todo-summary","data":{}}'`

Successful responses confirm Express, Prisma, the job queue, and the auth guard are functioning.
