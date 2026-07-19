# Architecture Guide

This project uses a domain-driven, feature-based architecture with clear separation between app-specific and shared modules.

## High-Level Structure

```
packages/core/src/          # Boilerplate (synced)
├── shared/           # Reusable feature modules
└── core/             # Infrastructure and utilities

apps/web/src/server/          # App-owned (not synced)
├── app/              # App-specific domain modules
├── routes.ts         # Central route registration
└── index.ts          # Server entry point
```

## Server Layers

### 1. Feature Modules (`app/` and `shared/`)

Each feature is a self-contained module with all its components:

```
feature/
├── feature.routes.ts      # Route definitions + inline request handlers
├── feature.service.ts     # Business logic (calls Prisma directly)
├── feature.schema.ts  # Zod schemas
├── feature.jobs.ts        # Background jobs (optional)
└── feature.utils.ts       # Optional utilities (e.g. webauthn)
```

**App vs Shared:**

- `app/` - Domain-specific features (e.g., `todo/`)
- `shared/` - Reusable features (auth, storage, jobs, settings, ai)

### 2. Core Infrastructure (`core/`)

| Directory      | Purpose                                             |
| -------------- | --------------------------------------------------- |
| `ai/`          | Unified LLM client with Zod structured output       |
| `errors/`      | Boom HTTP errors, error codes, Prisma error handler |
| `job/`         | Job queue (client, queries, queue, worker)          |
| `kv/`          | Keyv-based key-value storage                        |
| `logger/`      | Pino logger with AsyncLocalStorage context          |
| `middlewares/` | Auth, validation, rate-limiting, error handling     |
| `storage/`     | S3 storage service                                  |
| `utils/`       | Router helper, controller utilities                 |

### 3. Request Flow

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

Routes use `createRouter()` which automatically wraps handlers:

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

Route handlers are simple async functions defined directly in the routes file. They parse requests, call services, and return values:

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

No base classes, no manual response handling - just return values. Services call Prisma directly; no separate model layer.

### Validation Middleware

Zod schemas validate requests:

```typescript
import { createTodoSchema } from "./todo.schema";

router.post("/", controller.create);
```

Controllers use typed helpers (`parseBody`, `parseQuery`, `parseParams`) to read validated data securely:

### Error Handling

Use `Boom` for HTTP errors:

```typescript
import { Boom } from "@groot/core/errors";

if (!todo) {
  throw Boom.notFound("Todo not found");
}
```

Prisma errors are automatically transformed by `PrismaHandler`.

## Background Job System

Built on an engine-selected queue adapter — [pg-boss](https://github.com/timgit/pg-boss) on Postgres, [honker](https://github.com/russellromney/honker) on SQLite — behind a shared `JobQueueAdapter` interface (see [Database Engines](../database-engines.md#job-queue-adapter)). Modular structure:

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

## Logger System

Pino-based logging with context management:

```typescript
import { logger, createContextLogger } from "@groot/core/logger";

// Basic logging
logger.info("User logged in", { userId });

// Context-aware logging
const log = createContextLogger("todo-service");
log.debug("Processing todo", { todoId });
```

Uses AsyncLocalStorage for request tracing.

## Key-Value Store

Keyv with a SQLite or PostgreSQL adapter (selected by `DATABASE_ENGINE`):

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

1. **Public Routes** (`/api/v1/auth`, `/api/v1/passkey`, `/api/v1/public/*`)
   - No auth required

2. **Protected Routes** (`/api/v1/*` except public)
   - JWT token via `Authorization: Bearer <token>`
   - Validated by `jwtAuthMiddleware`

3. **Admin Routes**
   - Additional `X-Admin-Auth-Key` header
   - Validated by `adminAuthMiddleware`

## Route Registration

Centralized in `routes.ts`:

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

1. **Routing** – React Router 7 in `apps/web/src/client/App.tsx`
2. **State** – Zustand stores (`@groot/shell/store/auth`)
3. **Data Fetching** – React Query + Axios (`@groot/shell/lib/api`)
4. **UI** – Tailwind + Radix primitives (`@groot/ui`)

## Adding a New Feature

1. Create feature directory in `apps/web/src/server/api/` (app-specific) or `packages/core/src/` (reusable)
2. Add files: routes (with inline handlers), service, validation
3. Register routes in `routes.ts`
4. Register jobs in `registerJobHandlers()` if needed
5. Add environment variables to `.env.schema`
6. Write tests in `tests/server/`

## Design Principles

- **Feature Isolation**: Each feature is self-contained
- **Functional Controllers**: Simple functions, no classes
- **Automatic Serialization**: Return values, not response objects
- **Centralized Registration**: One place for routes and jobs
- **Standardized Errors**: Boom factory methods throughout
- **Validated Inputs**: Zod schemas at system boundaries
