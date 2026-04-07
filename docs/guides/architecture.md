# Architecture Guide

This project uses a domain-driven, feature-based architecture with clear separation between app-specific and shared modules.

## High-Level Structure

```
server/src/
├── app/              # App-specific domain modules
├── shared/           # Reusable feature modules
├── core/             # Infrastructure and utilities
├── routes.ts         # Central route registration
└── index.ts          # Server entry point
```

## Server Layers

### 1. Feature Modules (`app/` and `shared/`)

Each feature is a self-contained module with all its components:

```
feature/
├── feature.routes.ts      # Route definitions
├── feature.controller.ts  # Request handlers
├── feature.service.ts     # Business logic
├── feature.validation.ts  # Zod schemas
├── feature.model.ts       # Prisma queries
├── feature.jobs.ts        # Background jobs (optional)
└── index.ts               # Exports
```

**App vs Shared:**
- `app/` - Domain-specific features (e.g., `todo/`)
- `shared/` - Reusable features (auth, storage, jobs, settings, ai)

### 2. Core Infrastructure (`core/`)

| Directory | Purpose |
| --------- | ------- |
| `ai/` | Unified LLM client with Zod structured output |
| `errors/` | Boom HTTP errors, error codes, Prisma error handler |
| `job/` | Job queue (client, queries, queue, worker) |
| `kv/` | Keyv-based key-value storage |
| `logger/` | Pino logger with AsyncLocalStorage context |
| `middlewares/` | Auth, validation, rate-limiting, error handling |
| `storage/` | S3 storage service |
| `utils/` | Router helper, controller utilities |

### 3. Request Flow

```
HTTP Request
    ↓
Middlewares (CORS, logging, auth, JSON parsing)
    ↓
Route Handler (createRouter auto-wraps with handle middleware)
    ↓
Controller (async function returning value)
    ↓
Service (business logic)
    ↓
Model (Prisma queries)
    ↓
Database (PostgreSQL)
    ↓
Response (auto-serialized by handle middleware)
```

## Key Patterns

### createRouter Utility

Routes use `createRouter()` which automatically wraps handlers:

```typescript
import { createRouter } from "@/core/utils/router.utils";
import * as controller from "./todo.controller";

const router = createRouter();

// Handler is auto-wrapped with handle() middleware
router.get("/", controller.getAll);
router.post("/", controller.create);

export default router;
```

### Functional Controllers

Controllers are simple async functions that return values:

```typescript
export async function getAll() {
  return await TodoService.findAll();
}

export async function create(req: Request, res: Response) {
  const payload = req.validated?.body || req.body;
  res.status(201);
  return await TodoService.create({ data: payload });
}

export async function getById(req: Request) {
  const id = parseId(req.params.id);
  return await TodoService.findById({ id });
}
```

No base classes, no manual response handling - just return values.

### Validation Middleware

Zod schemas validate requests:

```typescript
import { validate } from "@/core/middlewares/validation.middleware";
import { createTodoSchema } from "./todo.validation";

router.post("/", validate(createTodoSchema, "body"), controller.create);
```

Validated data is available at `req.validated.body`.

### Error Handling

Use `Boom` for HTTP errors:

```typescript
import { Boom } from "@/core/errors";

if (!todo) {
  throw Boom.notFound("Todo not found");
}
```

Prisma errors are automatically transformed by `PrismaHandler`.

## Background Job System

Built on pg-boss with modular structure:

| File | Purpose |
| ---- | ------- |
| `core/job/config.ts` | Environment-based configuration |
| `core/job/client.ts` | PgBoss singleton instance |
| `core/job/queue.ts` | Job registration and queueing API |
| `core/job/queries.ts` | Job inspection queries |
| `core/job/worker.ts` | Worker management |
| `core/job/error-handler.ts` | Sentry + logging wrapper |

### Job Registration

Jobs are registered in feature modules:

```typescript
// todo.jobs.ts
import { registerJobHandler, type JobHandler } from "@/core/job";

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
import { logger, createContextLogger } from "@/core/logger";

// Basic logging
logger.info("User logged in", { userId });

// Context-aware logging
const log = createContextLogger("todo-service");
log.debug("Processing todo", { todoId });
```

Uses AsyncLocalStorage for request tracing.

## Key-Value Store

Keyv with PostgreSQL adapter:

```typescript
import kv, { createNamespaceKv } from "@/core/kv";

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
   - Additional `X-Admin-Auth` header
   - Validated by `adminAuthMiddleware`

## Route Registration

Centralized in `routes.ts`:

```typescript
export function registerRoutes(app: Express): void {
  // Public routes
  app.use("/api/v1/public/files", publicFileRoutes);
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

1. **Routing** – React Router 7 in `client/src/App.tsx`
2. **State** – Zustand stores (`store/auth.ts`)
3. **Data Fetching** – React Query + Axios (`lib/api.ts`)
4. **UI** – Tailwind + Radix primitives (`components/ui/`)

## Adding a New Feature

1. Create feature directory in `app/` or `shared/`
2. Add files: routes, controller, service, validation, model
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
