# Express + React Boilerplate Docs

Welcome to the documentation hub for the Express + React boilerplate. Use this space to discover how the API, background jobs, and Vite client fit together.

## Quick Navigation

### 🚀 Getting Started

- **[Quick Start](./quick-start.md)** – Get started in 3 steps with authentication, components, and examples
- **[Setup Guide](./SETUP_GUIDE.md)** – Environment variables, database, and local workflow
- **[Development Workflow](./guides/development.md)** – Day-to-day commands, conventions, and scripts

### 🧱 Guides

- **[Architecture](./guides/architecture.md)** – Server layers, job system, and client structure
- **[Testing](./guides/testing.md)** – Vitest + Supertest guidance and patterns
- **[Pre-commit Hooks](./precommit-hooks.md)** – Gitleaks secret detection and linting automation

### ✨ Features

- **[Todos API](./features/todos.md)** – CRUD contract, validation, and React integration
- **[Background Jobs](./features/jobs.md)** – pg-boss queues, handlers, and job API
- **[Client](./features/client.md)** – Routing, auth guard, and data fetching patterns
- **[Storage](./features/storage.md)** – S3-backed file browser, secure shares, and rate limits
- **[Passkey Authentication](./features/passkey-authentication.md)** – WebAuthn/FIDO2 passwordless authentication
- **[AI Inference](./features/ai-inference.md)** – Unified LLM API integration with Zod structured output

### 📚 Examples & Reference

- **[API Request Recipes](./examples/api-requests.md)** – Copy-ready curl snippets
- **[Boilerplate Enhancements](./boilerplate-enhancements.md)** – Complete reference of all added features (60+ files, 8000+ lines)
- **[Changelog](./CHANGELOG.md)** – Documentation changes over time

## Project Overview

This boilerplate ships a secure Express 5 + TypeScript server inside `server/src` and a Vite-powered React 19 client inside `client/src`. The API exposes `/api/v1/todos` for CRUD operations and `/api/v1/jobs` for pg-boss queue management, all protected by basic authentication. The SPA consumes the same API via Axios + React Query, rendering dashboards and todo lists for authenticated users.

Key capabilities:

- **Todo lifecycle** – Validation via `todo.validation.ts`, persistence through Prisma, and consistent responses via `ResponseHandler`
- **Background processing** – Pg-boss queues boot from `core/job`, with workers registered in `server/src/jobs`
- **Full-stack DX** – Shared TypeScript tooling, Vite+ (Oxlint/Oxfmt), Vitest tests, and Tailwind UI components

## Tech Stack Highlights

| Area    | Technologies                                                       |
| ------- | ------------------------------------------------------------------ |
| Server  | Node 18+, Express 5, pg-boss, Prisma, Pino, Sentry                 |
| Client  | React 19, Vite 7, React Router 7, React Query 5, Zustand, Tailwind |
| Tooling | TypeScript 5.8, Vite+ (Oxlint/Oxfmt), Vitest + Supertest, pnpm     |

## API Surface

- `GET /health` – Health probe without auth
- `GET/POST/PUT/DELETE /api/v1/todos` – Todo CRUD guarded by `basicAuthMiddleware`
- `POST /api/v1/jobs` – Queue jobs defined in `core/job/queue.ts`
- `POST /api/v1/jobs/schedule` – Cron scheduling
- `GET /api/v1/jobs` – Filter jobs by state/name, plus supporting routes for retries, cancellations, stats, and failed listings

## Architecture at a Glance

```
Request → Middlewares (logging, auth, validation)
        → Routes (`routes/*.ts`)
        → Controllers (`controllers/*.ts`)
        → Services (`services/*.ts`)
        → Models / Prisma (`models/*.ts`)
        → PostgreSQL

Jobs: PgBoss → Handlers (`jobs/*.ts`) → Prisma/logger/Sentry

Client: React Router → Layout + ProtectedRoute → Pages → Hooks (React Query) → Axios → /api/v1
```

## Next Steps

Jump into the guides linked above to understand setup, architecture decisions, feature specifics, and real-world API commands. Keep the changelog updated when documentation evolves.
