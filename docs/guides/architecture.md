# Architecture Guide

How the server and client code is organized, and the conventions that keep feature modules consistent across the codebase.

## High-Level Structure

```
packages/core/src/             # Boilerplate (synced)
├── auth/, passkey/, settings/, notification/, storage/  # Reusable feature modules
├── ai/, kv/, logger/, database/, config/, errors/        # Infrastructure and utilities
├── middlewares/                                          # Auth, validation, rate-limiting
└── utils/                                                # Router + controller helpers

apps/web/src/server/           # App-owned (not synced)
├── api/                       # App-specific domain modules (e.g. todo/)
├── routes.ts                  # Central route registration
└── index.ts                   # Server entry point
```

## Server Layers

### 1. Feature Modules

Each feature is a self-contained module with all its components:

```
feature/
├── feature.routes.ts   # Route definitions + inline request handlers
├── feature.service.ts  # Business logic (calls Prisma directly)
├── feature.schema.ts   # Zod schemas
├── feature.jobs.ts     # Background jobs (optional)
└── feature.utils.ts    # Optional utilities (e.g. webauthn)
```

App-specific domains (e.g. `todo/`) live in `apps/web/src/server/api/`. Reusable, synced features (auth, passkey, storage, settings, ai) live directly in `packages/core/src/`.

### 2. Core Infrastructure (`packages/core/src/`)

| Directory                                         | Purpose                                              |
| ------------------------------------------------- | ---------------------------------------------------- |
| `ai/`                                             | Unified LLM client with Zod structured output        |
| `auth/`, `passkey/`, `settings/`, `notification/` | Reusable feature modules (routes + service + schema) |
| `database/`                                       | Prisma client + engine selection                     |
| `errors/`                                         | Boom HTTP errors, error codes, Prisma error handler  |
| `kv/`                                             | Keyv-based key-value storage                         |
| `logger/`                                         | Pino logger with AsyncLocalStorage context           |
| `middlewares/`                                    | Auth, validation, rate-limiting, error handling      |
| `storage/`                                        | S3 storage service                                   |
| `utils/`                                          | Router helper, controller utilities                  |

### Request Flow

```
HTTP Request
    ↓
Middlewares (CORS, logging, auth, JSON parsing)
    ↓
Route Handler (createRouter auto-wraps with handle middleware)
    ↓
Service (business logic + Prisma queries)
    ↓
Database (SQLite or PostgreSQL — see [Database Engines](../database-engines.md))
    ↓
Response (auto-serialized by handle middleware)
```

## Key Patterns

### createRouter Utility

`createRouter()` wraps every handler with the serialization/error middleware:

```typescript
import { createRouter } from "@groot/core/utils/router.utils";
import { parseBody } from "@groot/core/utils/controller.utils";
import * as todoService from "./todo.service";
import { createTodoSchema } from "./todo.schema";

const router = createRouter();

// Handler is auto-wrapped with handle() middleware
router.get("/", async () => {
  return await todoService.findAll();
});

router.post("/", async (req, res) => {
  const payload = parseBody(req, createTodoSchema);
  res.status(201);
  return await todoService.create({ data: payload });
});

export default router;
```

### Inline Route Handlers

Handlers are plain async functions defined directly in the routes file — parse the request, call the service, return the value:

```typescript
export async function getAll() {
  return await todoService.findAll();
}

export async function create(req: Request, res: Response) {
  const payload = parseBody(req, createTodoSchema);
  res.status(201);
  return await todoService.create({ data: payload });
}

export async function getById(req: Request) {
  const id = parseId(req.params.id);
  return await todoService.findById({ id });
}
```

```typescript
export async function create({ data }: { data: CreateTodoDTO }) {
  return prisma.todo.create({ data });
}

export async function findById({ id }: { id: number }) {
  const todo = await prisma.todo.findUnique({ where: { id } });
  if (!todo) {
    throw Boom.notFound("Todo not found");
  }
  return todo;
}
```

No base classes, no manual response handling — just return values. Services call Prisma directly; there's no separate model layer.

### Validation

Zod schemas in `*.schema.ts` validate requests. Handlers read validated data via typed helpers — `parseBody`, `parseQuery`, `parseParams` — from `@groot/core/utils/controller.utils`:

```typescript
import { createTodoSchema } from "./todo.schema";

router.post("/", controller.create);
```

### Error Handling

`Boom` produces standardized HTTP errors:

```typescript
import { Boom } from "@groot/core/errors";

if (!todo) {
  throw Boom.notFound("Todo not found");
}
```

Prisma errors are transformed automatically by `PrismaHandler`.

## Background Job System

An engine-selected queue adapter — [pg-boss](https://github.com/timgit/pg-boss) on Postgres, [honker](https://github.com/russellromney/honker) on SQLite — sits behind a shared `JobQueueAdapter` interface (see [Database Engines](../database-engines.md#job-queue-adapter)):

| File (in `packages/jobs/src/server/`) | Purpose                                        |
| ------------------------------------- | ---------------------------------------------- |
| `adapter.ts`                          | `JobQueueAdapter` interface + normalized types |
| `pgboss-adapter.ts`                   | pg-boss implementation (Postgres)              |
| `honker-adapter.ts`                   | honker implementation (SQLite)                 |
| `client.ts`                           | Constructs the active adapter                  |
| `queue.ts`                            | Job registration and queueing API              |
| `queries.ts`                          | Job inspection queries                         |
| `worker.ts`                           | Worker management                              |
| `error-handler.ts`                    | Sentry + logging wrapper                       |

### Job Registration

Jobs are registered in feature modules:

```typescript
// todo.jobs.ts
import { registerJobHandler, type JobHandler } from "@groot/jobs/server";

export const cleanupHandler: JobHandler<CleanupPayload> = async ({ data }) => {
  // Job logic
};

export function registerTodoJobs(): void {
  registerJobHandler("todo-cleanup", cleanupHandler);
}
```

Then added to `routes.ts`:

```typescript
export function registerJobHandlers(): void {
  registerTodoJobs();
  // Future jobs...
}
```

## Logger

Pino-based logging with AsyncLocalStorage context for request tracing:

```typescript
import { logger, createContextLogger } from "@groot/core/logger";

// Basic logging
logger.info("User logged in", { userId });

// Context-aware logging
const log = createContextLogger("todo-service");
log.debug("Processing todo", { todoId });
```

## Key-Value Store

Keyv, backed by SQLite or PostgreSQL depending on `DATABASE_ENGINE`:

```typescript
import kv, { createNamespaceKv } from "@groot/core/kv";

// Basic usage
await kv.set("key", { data: "value" });
const value = await kv.get("key");

// Namespaced
const cacheKv = createNamespaceKv("cache");
await cacheKv.set("user:123", userData);
```

## Authentication Flow

| Layer     | Routes                                                | Requirement                                                             |
| --------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| Public    | `/api/v1/auth`, `/api/v1/passkey`, `/api/v1/public/*` | None                                                                    |
| Protected | `/api/v1/*` (all else)                                | JWT via `Authorization: Bearer <token>`, checked by `jwtAuthMiddleware` |
| Admin     | Subset of protected routes                            | Additional `X-Admin-Auth-Key` header, checked by `adminAuthMiddleware`  |

## Route Registration

All routes are wired centrally in `routes.ts`:

```typescript
export function registerRoutes(app: Express): void {
  // Public auth routes
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/passkey", passkeyRoutes);

  // Protected routes (JWT required)
  const protectedRouter = Router();
  protectedRouter.use("/todos", todoRoutes);
  protectedRouter.use("/jobs", jobRoutes);
  protectedRouter.use("/storage", storageRoutes);
  protectedRouter.use("/settings", appSettingsRoutes);
  protectedRouter.use("/ai", aiRoutes);

  app.use("/api/v1", jwtAuthMiddleware, protectedRouter);
}
```

## Client Architecture

| Concern       | Approach                                      |
| ------------- | --------------------------------------------- |
| Routing       | React Router 7, `apps/web/src/client/App.tsx` |
| State         | Zustand stores (`@groot/shell/store/auth`)    |
| Data fetching | React Query + Axios (`@groot/shell/lib/api`)  |
| UI            | Tailwind + Radix primitives (`@groot/ui`)     |

## Adding a New Feature

1. Create the feature directory under `apps/web/src/server/api/` (app-specific) or `packages/core/src/` (reusable)
2. Add `feature.routes.ts` (with inline handlers), `feature.service.ts`, and `feature.schema.ts`
3. Register the routes in `routes.ts`
4. Register jobs in `registerJobHandlers()` if the feature has any
5. Add new environment variables to `.env.schema`
6. Write tests in `tests/server/`

See [Development Workflow](./development.md) for the full walkthrough.

## Design Principles

| Principle                | What it means                                |
| ------------------------ | -------------------------------------------- |
| Feature isolation        | Each feature is self-contained               |
| Functional controllers   | Simple functions, no classes                 |
| Automatic serialization  | Handlers return values, not response objects |
| Centralized registration | One place for routes and jobs                |
| Standardized errors      | `Boom` factory methods throughout            |
| Validated inputs         | Zod schemas at every system boundary         |
