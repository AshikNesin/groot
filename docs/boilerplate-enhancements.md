# SaaS Boilerplate Enhancements

## Overview

This document describes the production-ready features and architecture of the groot boilerplate.

---

## Architecture

### Domain-Driven Structure

The codebase uses a feature-based architecture:

```
server/src/
├── app/              # App-specific domain modules
│   └── todo/         # Self-contained feature
│       ├── todo.routes.ts
│       ├── todo.controller.ts
│       ├── todo.service.ts
│       ├── todo.validation.ts
│       ├── todo.model.ts
│       ├── todo.jobs.ts
│       └── index.ts
├── shared/           # Reusable features
│   ├── auth/
│   ├── passkey/
│   ├── jobs/
│   ├── storage/
│   ├── settings/
│   └── ai/
├── core/             # Infrastructure
│   ├── ai/
│   ├── errors/
│   ├── job/
│   ├── kv/
│   ├── logger/
│   ├── middlewares/
│   ├── storage/
│   └── utils/
└── routes.ts         # Central registration
```

---

## Core Infrastructure

### 1. Error System

**Boom Factory** (`core/errors/boom.ts`):

```typescript
import { Boom } from "@/core/errors";

throw Boom.notFound("Todo not found");
throw Boom.badRequest("Invalid input");
throw Boom.unauthorized("Token expired");
throw Boom.forbidden("Access denied");
```

**Error Codes** (`core/errors/error-codes.ts`):

- Object-based error codes for consistency
- Extensible with custom codes

**Prisma Handler** (`core/errors/prisma-error-handler.ts`):

- Converts Prisma errors to application errors
- Handles unique constraints, not found, foreign key violations

### 2. Logger System

**Pino with Context** (`core/logger/`):

- `core.ts` - Main logger configuration
- `context.ts` - AsyncLocalStorage-based context
- `breadcrumbs.ts` - Request tracking
- `trace-context.ts` - Distributed tracing
- `job-stream.ts` - Job-specific stream

```typescript
import { createRequestLogger, createJobLogger } from "@/core/logger";

const logger = createRequestLogger(req);
logger.info({ userId }, "User action");
```

### 3. Job System

**Modularized pg-boss** (`core/job/`):

| Module       | Purpose                   |
| ------------ | ------------------------- |
| `config.ts`  | Environment configuration |
| `client.ts`  | PgBoss singleton          |
| `queue.ts`   | Job queueing/scheduling   |
| `queries.ts` | Job inspection            |
| `worker.ts`  | Handler registration      |

**Dynamic Registration**:

```typescript
// Feature jobs
import { registerJobHandler, type JobHandler } from "@/core/job";

export const myHandler: JobHandler<Payload> = async ({ data }) => {
  // Job logic
};

export function registerFeatureJobs(): void {
  registerJobHandler("my-job", myHandler);
}
```

### 4. Key-Value Store

**Keyv with PostgreSQL** (`core/kv/`):

```typescript
import kv, { createNamespaceKv } from "@/core/kv";

// Basic usage
await kv.set("key", { data: "value" });
const value = await kv.get("key");

// Namespaced
const cache = createNamespaceKv("cache");
await cache.set("user:123", userData);
```

### 5. AI Integration

**Unified LLM API** (`core/ai/`):

- `@mariozechner/pi-ai` integration
- Zod schema conversion for structured output
- Support for OpenAI, Anthropic, Google AI

```typescript
import { ai, schema } from "@/core/ai";

const response = await ai.chat({
  messages: [{ role: "user", content: "Hello" }],
  schema: schema.object({
    greeting: schema.string(),
  }),
});
```

### 6. Storage Service

**S3-Compatible Storage** (`core/storage/`):

- File upload/download
- Presigned URLs
- Public file sharing

---

## Authentication

### JWT Authentication

```typescript
// Middleware
import { jwtAuthMiddleware } from "@/core/middlewares/jwt-auth.middleware";

// Protected routes
app.use("/api/v1", jwtAuthMiddleware, protectedRouter);
```

### Admin Authentication

```typescript
import { adminAuthMiddleware } from "@/core/middlewares/admin-auth.middleware";

// Admin-only endpoints
router.post("/users", adminAuthMiddleware, createUser);
```

### Passkey/WebAuthn

Complete passwordless authentication with biometrics:

- `@simplewebauthn/server` + `@simplewebauthn/browser` v13
- Registration and authentication flows
- Passkey management UI

---

## Routing System

### createRouter Utility

```typescript
import { createRouter } from "@/core/utils/router.utils";
import * as controller from "./feature.controller";

const router = createRouter();

// Handlers auto-wrapped with `handle` middleware
router.get("/", controller.getAll);
router.post("/", controller.create);

export default router;
```

### Route Handler Middleware

Controllers return values, not response objects:

```typescript
export async function getAll() {
  return await Service.findAll(); // Auto-serialized to JSON
}

export async function create(req: Request, res: Response) {
  res.status(201); // Set status if needed
  return await Service.create({ data: payload });
}
```

---

## Frontend

### Design System

**Tokens** (`client/src/lib/design-tokens.ts`):

- Gray scale colors
- Semantic colors (success, warning, error, info)
- Typography scale
- Spacing scale
- Component variants

### UI Components (26 components)

| Category   | Components                                       |
| ---------- | ------------------------------------------------ |
| Forms      | Input, Textarea, Select, Checkbox, Switch, Form  |
| Data       | Table, Badge, Pagination                         |
| Feedback   | Alert, Progress, LoadingSpinner, LoadingSkeleton |
| Overlays   | Dialog, Sheet, Popover, DropdownMenu             |
| Layout     | PageLayout, PageHeader, PageContainer, Section   |
| Navigation | Tabs, Breadcrumb                                 |
| Utility    | Button, Card, Separator, EmptyState, ErrorState  |

### API Client

```typescript
import { apiClient } from "@/lib/api";

// Type-safe requests
const todos = await apiClient.get<Todo[]>("/todos");
const created = await apiClient.post<Todo>("/todos", { title: "New" });

// Auth methods
await apiClient.login(email, password);
await apiClient.logout();
const user = await apiClient.getCurrentUser();
```

---

## Testing

### Structure

```
tests/
├── server/
│   ├── setup.ts
│   ├── core/          # Core utility tests
│   └── services/      # Service tests
└── client/
    ├── setup.ts
    └── components/    # Component tests
```

### Commands

```bash
pnpm test           # Unit tests
pnpm test:watch     # Watch mode
pnpm test:e2e       # E2E tests (Playwright)
```

---

## File Structure

```
groot/
├── server/src/
│   ├── app/              # Domain modules
│   ├── shared/           # Shared features
│   ├── core/             # Infrastructure
│   │   ├── ai/           # AI client
│   │   ├── errors/       # Boom, error codes, Prisma handler
│   │   ├── job/          # Job queue
│   │   ├── kv/           # Key-value store
│   │   ├── logger/       # Pino logging
│   │   ├── middlewares/  # Express middlewares
│   │   ├── storage/      # S3 service
│   │   └── utils/        # Utilities
│   ├── routes.ts         # Route registration
│   └── index.ts          # Entry point
├── client/src/
│   ├── components/
│   │   ├── ui/           # 26 UI components
│   │   └── layout/       # Layout components
│   ├── lib/              # API client, utilities
│   ├── store/            # Zustand stores
│   └── hooks/            # React hooks
├── tests/                # Centralized tests
├── docs/                 # Documentation
└── prisma/               # Database schema
```

---

## Environment Variables

```bash
# Core
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=your-secret
ADMIN_AUTH_KEY=admin-key

# Passkeys
RP_ID=localhost
RP_NAME=Groot
RP_ORIGIN=https://groot.localhost

# File Storage
AWS_ACCESS_KEY_ID=localstack
AWS_SECRET_ACCESS_KEY=localstack
AWS_REGION=us-east-1
AWS_DEFAULT_S3_BUCKET=local-bucket

# Job Queue
ENABLE_JOB_QUEUE=true
JOB_CONCURRENCY=5
JOB_POLL_INTERVAL=2000

# Monitoring
SENTRY_DSN=https://...
LOG_LEVEL=info

# AI (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
```

---

## API Endpoints

| Prefix                 | Purpose                   | Auth  |
| ---------------------- | ------------------------- | ----- |
| `/api/v1/auth`         | Login, logout, users      | Mixed |
| `/api/v1/passkey`      | Passkey registration/auth | Mixed |
| `/api/v1/todos`        | CRUD operations           | JWT   |
| `/api/v1/jobs`         | Background job management | JWT   |
| `/api/v1/storage`      | File operations           | JWT   |
| `/api/v1/settings`     | App settings              | JWT   |
| `/api/v1/ai`           | AI inference              | JWT   |
| `/api/v1/public/files` | Public file sharing       | None  |

---

## Key Patterns

| Pattern                  | Description                                                 |
| ------------------------ | ----------------------------------------------------------- |
| Feature modules          | Self-contained with routes, controller, service, validation |
| Functional controllers   | Simple async functions returning values                     |
| createRouter             | Auto-wraps handlers with response middleware                |
| Boom errors              | Factory methods for HTTP errors                             |
| Dynamic job registration | Jobs registered in feature modules                          |
| Zod validation           | Input validation at system boundaries                       |

---

**Last Updated**: 2026-04-07
**Status**: Production-ready
