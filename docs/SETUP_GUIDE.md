# Setup Guide

Follow these steps to boot the Express API, job queue, and React client locally or in production.

## Prerequisites

- Node.js 18+
- pnpm (the repo is configured for pnpm scripts)
- PostgreSQL instance reachable via `DATABASE_URL`
- OpenSSL or another tool for generating basic auth credentials

## Quick Setup

### Automated Setup (Recommended)

Run the setup script to automatically configure your environment:

```bash
./setup-boilerplate.sh
```

This script will:

- Copy `.env.example` to `.env`
- Generate secure `JWT_SECRET` (64 characters)
- Generate secure `ADMIN_AUTH_KEY` (48 characters)
- Prompt for your app name and update `RP_NAME`
- Optionally update package.json and code references

### Manual Setup

Copy `.env.example` to `.env` and populate these keys (validated in `server/src/env.ts`):

| Variable                                      | Description                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `NODE_ENV`                                    | `development`, `production`, or `test`                                 |
| `PORT`                                        | HTTP port for Express (default `3000`)                                 |
| `DATABASE_URL`                                | PostgreSQL connection string used by Prisma and pg-boss                |
| `BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD` | Credentials enforced by `basicAuthMiddleware` for all `/api/v1` routes |

### Authentication Variables

| Variable         | Description                                           |
| ---------------- | ----------------------------------------------------- |
| `JWT_SECRET`     | Secret key for signing JWT tokens (min 32 characters) |
| `ADMIN_AUTH_KEY` | Key for admin-only routes (X-Admin-Auth header)       |

### Passkey (WebAuthn) Variables

| Variable    | Description                                                        |
| ----------- | ------------------------------------------------------------------ |
| `RP_ID`     | Relying Party ID (e.g., `localhost` for dev, your domain for prod) |
| `RP_NAME`   | Display name for passkey prompts                                   |
| `RP_ORIGIN` | Full origin URL (e.g., `http://localhost:3000`)                    |

### File Storage (S3) Variables

| Variable                | Description                       |
| ----------------------- | --------------------------------- |
| `AWS_ACCESS_KEY_ID`     | AWS access key for S3             |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for S3             |
| `AWS_DEFAULT_REGION`    | AWS region (default: `us-east-1`) |
| `AWS_DEFAULT_S3_BUCKET` | S3 bucket name for file storage   |

### Job Queue Variables

| Variable                              | Description                                                 |
| ------------------------------------- | ----------------------------------------------------------- |
| `ENABLE_JOB_QUEUE`                    | Enable/disable job processing (default: `true`)             |
| `JOB_CONCURRENCY`                     | Number of workers registered per job (default `5`)          |
| `JOB_POLL_INTERVAL`                   | Worker polling interval in milliseconds (default `2000`)    |
| `JOB_ARCHIVE_COMPLETED_AFTER_SECONDS` | Pg-boss archival window (default `86400`)                   |
| `JOB_DELETE_ARCHIVED_AFTER_SECONDS`   | Pg-boss deletion window (default `604800`)                  |
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
pnpm prisma:push          # sync schema to your database
pnpm dev                  # runs server + Vite dev middleware
```

- Visit `http://localhost:3000` for the client. The backend mounts Vite middleware automatically while `NODE_ENV=development`.
- Hit `http://localhost:3000/health` without auth to confirm the API is live.
- Interact with `/api/v1/todos` or `/api/v1/jobs` using basic auth headers (`Authorization: Basic base64(username:password)`).

## Production Build

```bash
pnpm build        # Builds client (Vite) and bundles server (scripts/build.mjs)
pnpm start        # Serves dist/bundle.js with NODE_ENV=production
```

In production mode the server:

- Serves the prebuilt client from `dist/`
- Enables gzip via `compression`
- Boots pg-boss (`initJobQueue()` + `startWorkers()`) immediately when the HTTP listener starts

## Database & Prisma

- Prisma client is generated automatically via `pnpm install` (`postinstall` runs `prisma generate`).
- To re-sync schema changes: `pnpm prisma:push`.
- The Prisma client emitted into `server/src/generated/prisma` feeds both HTTP handlers and job processors.

## Background Job Queue

- Configuration comes from `core/job/config.ts`.
- Workers register when `startWorkers()` runs inside `server/src/index.ts`.
- Ensure your PostgreSQL role can create the `pgboss` schema; run migrations or let pg-boss bootstrap tables at startup.

## Verifying the Stack

1. `curl http://localhost:3000/health`
2. `curl -u username:password http://localhost:3000/api/v1/todos`
3. `curl -u username:password -X POST http://localhost:3000/api/v1/jobs -H 'Content-Type: application/json' -d '{"jobName":"todo-summary","data":{}}'`

Successful responses confirm Express, Prisma, pg-boss, and the auth guard are functioning.
