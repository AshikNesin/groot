# Architecture Guide

This project splits responsibilities between a layered Express API (`server/src`) and a Vite-powered React client (`client/src`).

## Server Layers

1. **Middlewares** – Located in `server/src/middlewares`. They handle CORS, compression, logging (`requestLogger.middleware.ts`), basic auth, validation (`validation.middleware.ts`), and error formatting.
2. **Routes** – Declared in `server/src/routes`. `index.ts` mounts domain-specific routers such as `todo.routes.ts` and `job.routes.ts` under `/api/v1`.
3. **Controllers** – `controllers/todo.controller.ts` translates HTTP requests into service calls, using `BaseController` helpers (ID parsing) and `ResponseHandler` for consistent JSON envelopes.
4. **Services** – `services/todo.service.ts` contains business logic, orchestrating Prisma models and throwing domain errors (`NotFoundError`).
5. **Models** – `models/todo.model.ts` encapsulates Prisma queries, ensuring controllers never touch the ORM directly.
6. **Core Utilities** – Logging (`core/logger`), env parsing (`env.ts` + `@t3-oss/env-core`), Sentry instrumentation (`core/instrument.ts`), response helpers, and Prisma bootstrap (`core/database.ts`).

### Error & Validation Flow

- Requests pass through `requestLoggerMiddleware` → `basicAuthMiddleware` → optional `validate(zodSchema)`.
- Controllers bubble domain errors to the centralized `error-handler.middleware.ts`, which formats responses and delegates exceptions to Sentry.

## Background Job Pipeline

The job system is built on [pg-boss](https://github.com/timgit/pg-boss).

1. **Configuration** – `core/job/config.ts` wires queue settings from validated env vars and defines default retry policies.
2. **Queue Runtime** – `core/job/index.ts` owns the singleton PgBoss instance, provides helpers (`addJob`, `scheduleJob`, `retryJob`, etc.), and coordinates lifecycle (`initJobQueue`, `stopJobQueue`).
3. **Workers** – `core/job/worker.ts` registers handlers via `registerJobHandler`, wraps them with `withSentryErrorCapture`, creates queues, and spins up `JOB_CONCURRENCY` workers per job.
4. **Handlers** – Stored in `server/src/jobs`. Each file imports `registerJobHandler` and implements the business logic (e.g., `todo-cleanup` deleting completed todos after a cutoff, `todo-summary` logging aggregate stats).
5. **Contracts** – `core/job/queue.ts` exports the `JobName` enum and TypeScript payload shapes consumed by both API routes and handlers.

Routes in `server/src/routes/job.routes.ts` expose a comprehensive REST surface for queueing, scheduling, retrying, cancelling, purging, and inspecting jobs. Tests in `server/src/routes/job.routes.test.ts` demonstrate mocking the job module when validating the API.

## Client Architecture

1. **Routing** – `client/src/App.tsx` sets up `react-router-dom` routes, gating protected content with `components/ProtectedRoute.tsx` and wrapping everything in a shared `Layout`.
2. **State & Auth** – `store/auth.ts` uses Zustand to manage basic auth tokens stored in `localStorage`. `Layout` and other components read from this store to show user context or redirect to `/login`.
3. **Data Layer** – `lib/api.ts` configures Axios with base URL `/api/v1` and injects the Basic Authorization header. Hooks inside `hooks/api/useTodos.ts` lean on React Query for caching, mutations, and automatic refetching.
4. **UI Components** – Tailwind + shadcn-inspired primitives live in `components/ui`. Pages such as `pages/Todos.tsx`, `pages/Dashboard.tsx`, and `pages/Login.tsx` compose these building blocks.
5. **Feedback** – `hooks/use-toast.ts` and `components/ui/toaster` surface optimistic UI feedback around mutations.

## Request Lifecycle Summary

```
Client (React Router + Axios)
    → /api/v1/* request with Basic Auth header
    → Express middlewares (logging, auth, JSON parsing, validation)
    → Route handler forwards to controller
    → Controller invokes service → model → Prisma → PostgreSQL
    → ResponseHandler standardizes payload
    → React Query cache updates + UI re-renders

Background jobs follow a similar path but start from PgBoss instead of HTTP, still using shared services/models when needed.
```

Use this layering blueprint when adding new domains: introduce validation, routes, controllers, services, models, and optional jobs in the same structure for consistency.
