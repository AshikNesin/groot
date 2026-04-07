# Express + React Boilerplate Docs

Welcome to the documentation hub for the Express + React boilerplate. This guide covers the domain-driven architecture, feature modules, and modern development patterns.

## Quick Navigation

### Getting Started

- **[Quick Start](./quick-start.md)** – Get started in 3 steps with authentication, components, and examples
- **[Setup Guide](./setup-guide.md)** – Environment variables, database, and local workflow
- **[Development Workflow](./guides/development.md)** – Day-to-day commands, conventions, and scripts

### Guides

- **[Architecture](./guides/architecture.md)** – Feature modules, core infrastructure, and request flow
- **[Portless & HTTPS](./guides/portless-https.md)** – Local HTTPS setup, certificate trust, and troubleshooting
- **[Testing](./guides/testing.md)** – Vitest + Supertest guidance and patterns
- **[Pre-commit Hooks](./precommit-hooks.md)** – Gitleaks secret detection and linting automation

### Features

- **[Todos API](./features/todos.md)** – CRUD contract, validation, and React integration
- **[Background Jobs](./features/jobs.md)** – pg-boss queues, dynamic registration, and job API
- **[Client](./features/client.md)** – Routing, auth guard, and data fetching patterns
- **[Storage](./features/storage.md)** – S3-backed file browser, secure shares, and rate limits
- **[Passkey Authentication](./features/passkey-authentication.md)** – WebAuthn/FIDO2 passwordless authentication
- **[AI Inference](./features/ai-inference.md)** – Unified LLM API with Zod structured output
- **[KV Storage](./kv.md)** – Keyv-based key-value storage with PostgreSQL backend

### Examples & Reference

- **[API Request Recipes](./examples/api-requests.md)** – Copy-ready curl snippets
- **[Boilerplate Enhancements](./boilerplate-enhancements.md)** – Complete reference of all added features
- **[Changelog](./CHANGELOG.md)** – Documentation changes over time

## Project Overview

This boilerplate ships a secure Express 5 + TypeScript server with a domain-driven architecture inside `server/src` and a Vite-powered React 19 client inside `client/src`.

### Architecture Highlights

- **Feature Modules** – Self-contained domains with routes, controllers, services, and jobs
- **App vs Shared** – `app/` for domain features, `shared/` for reusable modules
- **Core Infrastructure** – Modularized systems for jobs, logging, errors, storage, and AI
- **Functional Controllers** – Simple async functions returning values (auto-serialized)

### Key Capabilities

- **Todo lifecycle** – Validation via Zod, persistence through Prisma, Boom error handling
- **Background processing** – pg-boss queues with dynamic handler registration
- **Full-stack DX** – TypeScript, Vite+ (Oxlint/Oxfmt), Vitest, Playwright, Tailwind UI

## Tech Stack

| Area    | Technologies                                                       |
| ------- | ------------------------------------------------------------------ |
| Server  | Node 18+, Express 5, pg-boss, Prisma, Pino, Sentry, Boom           |
| Client  | React 19, Vite 7, React Router 7, React Query 5, Zustand, Tailwind |
| Tooling | TypeScript 5.9, Vite+ (Oxlint/Oxfmt), Vitest + Supertest, pnpm     |
| AI      | @mariozechner/pi-ai (unified LLM API with Zod structured output)   |

## API Surface

| Prefix                 | Purpose                        | Auth                |
| ---------------------- | ------------------------------ | ------------------- |
| `/api/v1/todos`        | CRUD operations                | JWT                 |
| `/api/v1/auth`         | Login, logout, user management | Mixed               |
| `/api/v1/storage`      | File storage operations        | JWT                 |
| `/api/v1/public/files` | Public file sharing            | None (rate-limited) |
| `/api/v1/jobs`         | Background job management      | JWT                 |
| `/api/v1/passkeys`     | Passkey registration/auth      | Public              |
| `/api/v1/settings`     | App key-value settings         | JWT                 |
| `/api/v1/ai`           | AI inference (chat, streaming) | JWT                 |
| `GET /health`          | Health probe                   | None                |

## Quick Architecture Diagram

```
HTTP Request
    ↓
Middlewares (logging, auth, validation)
    ↓
createRouter (auto-wraps handlers)
    ↓
Controller (async function → return value)
    ↓
Service (business logic)
    ↓
Model (Prisma queries)
    ↓
PostgreSQL

Background Jobs:
Feature.jobs.ts → registerJobHandler() → worker.ts → handler execution
```

## Core Modules

| Module      | Location            | Purpose                                             |
| ----------- | ------------------- | --------------------------------------------------- |
| AI          | `core/ai/`          | Unified LLM client with Zod schema conversion       |
| Errors      | `core/errors/`      | Boom factory, error codes, Prisma error handler     |
| Jobs        | `core/job/`         | Queue client, queries, worker, dynamic registration |
| KV          | `core/kv/`          | Keyv key-value storage with PostgreSQL              |
| Logger      | `core/logger/`      | Pino with AsyncLocalStorage context                 |
| Storage     | `core/storage/`     | S3 file storage service                             |
| Middlewares | `core/middlewares/` | Auth, validation, rate-limiting, error handling     |
| Utils       | `core/utils/`       | `createRouter`, `parseId`, validation helpers       |

## Next Steps

1. Read [Architecture Guide](./guides/architecture.md) for detailed patterns
2. Check [Setup Guide](./setup-guide.md) for environment configuration
3. Explore feature docs for specific implementation details
