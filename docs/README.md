# Documentation

This is the documentation hub for groot — a minimal Express + React + Prisma
boilerplate. Start with the **Quick start**, then dive into the guides and
feature docs as you need them.

## Getting started

| Document                                                 | What it covers                                     |
| -------------------------------------------------------- | -------------------------------------------------- |
| [`quick-start.md`](./quick-start.md)                     | Boot the app in 4 steps, create your first feature |
| [`setup-guide.md`](./setup-guide.md)                     | Environment variables, prerequisites, prod build   |
| [`database-engines.md`](./database-engines.md)           | SQLite (default) vs PostgreSQL, engine matrix      |
| [`guides/portless-https.md`](./guides/portless-https.md) | Local HTTPS via portless, certificate trust        |

## Guides

| Document                                                           | What it covers                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| [`guides/architecture.md`](./guides/architecture.md)               | Feature modules, core infrastructure, request flow   |
| [`guides/development.md`](./guides/development.md)                 | Day-to-day commands, conventions, adding a feature   |
| [`guides/database-migrations.md`](./guides/database-migrations.md) | Prisma migrate workflow, pooled-DB guidance          |
| [`guides/testing.md`](./guides/testing.md)                         | Vitest + Supertest patterns, running on both engines |
| [`config.md`](./config.md)                                         | `config.yml` settings, env interpolation, validation |
| [`precommit-hooks.md`](./precommit-hooks.md)                       | gitleaks secret detection + Vite+ staged lint/format |

## Features

| Document                                                                     | What it covers                                       |
| ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| [`features/todos.md`](./features/todos.md)                                   | The reference feature module (CRUD + jobs)           |
| [`features/jobs.md`](./features/jobs.md)                                     | Background jobs: adapter, registration, HTTP API, UI |
| [`features/client.md`](./features/client.md)                                 | Client routing, JWT auth guard, data fetching        |
| [`features/storage.md`](./features/storage.md)                               | S3 file browser, uploads, rate limits                |
| [`features/passkey-authentication.md`](./features/passkey-authentication.md) | WebAuthn/FIDO2 passwordless authentication           |
| [`features/ai-inference.md`](./features/ai-inference.md)                     | Unified LLM API with Zod structured output           |
| [`kv.md`](./kv.md)                                                           | Keyv key-value storage (SQLite or Postgres backend)  |

## Reference

| Document                                                 | What it covers                                      |
| -------------------------------------------------------- | --------------------------------------------------- |
| [`examples/api-requests.md`](./examples/api-requests.md) | Copy-ready `curl` recipes for every endpoint        |
| [`sync-guide.md`](./sync-guide.md)                       | Keeping child projects in sync with the boilerplate |
| [`sentry-source-maps.md`](./sentry-source-maps.md)       | Source map uploads for readable Sentry traces       |
| [`CHANGELOG.md`](./CHANGELOG.md)                         | Documentation changes over time                     |

## Tech stack at a glance

| Area    | Tech                                                             |
| ------- | ---------------------------------------------------------------- |
| Server  | Express 5, TypeScript, Prisma 7, pg-boss / honker, Pino, Sentry  |
| Client  | React 19, Vite 7, React Router 7, React Query, Zustand, Tailwind |
| Auth    | JWT + Passkeys (WebAuthn)                                        |
| Tooling | Vite+ (Oxlint/Oxfmt), Vitest + Supertest, Playwright, pnpm       |

## API surface

| Prefix             | Purpose                        | Auth                     |
| ------------------ | ------------------------------ | ------------------------ |
| `/api/v1/auth`     | Login, logout, user management | Public / JWT / admin key |
| `/api/v1/passkey`  | Passkey registration / login   | Public + JWT             |
| `/api/v1/todos`    | Todo CRUD                      | JWT                      |
| `/api/v1/jobs`     | Background job management      | JWT                      |
| `/api/v1/storage`  | S3 file operations             | JWT                      |
| `/api/v1/settings` | App key-value settings         | JWT                      |
| `GET /health`      | Health probe                   | None                     |
