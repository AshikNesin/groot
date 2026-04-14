# Express + React Boilerplate - AI Development Context

This file provides context for AI assistants (like Claude) working on this codebase.

## Project Overview

A production-ready SaaS boilerplate combining Express.js backend with React frontend. Built with TypeScript, Prisma, PostgreSQL, and a complete UI component library.

## Tech Stack

| Area                | Technologies                                          |
| ------------------- | ----------------------------------------------------- |
| **Backend**         | Node.js, Express 5, TypeScript, Prisma, PostgreSQL    |
| **Auth**            | JWT (bcryptjs), Passkeys (@simplewebauthn/server)     |
| **File Storage**    | AWS S3 SDK (@aws-sdk/client-s3)                       |
| **Background Jobs** | pg-boss (PostgreSQL-backed queue)                     |
| **Key-Value Store** | Keyv with PostgreSQL adapter                          |
| **Logging**         | Pino, Sentry (with AsyncLocalStorage context)         |
| **Error Handling**  | Boom (standardized HTTP errors)                       |
| **File Uploads**    | Multer                                                |
| **Frontend**        | React 19, TypeScript, Vite 7                          |
| **UI**              | Radix UI primitives, Tailwind CSS, shadcn/ui patterns |
| **State**           | Zustand, React Query                                  |
| **Routing**         | React Router 7                                        |
| **Tooling**         | Vite+ (Oxlint, Oxfmt), Vitest, Playwright, pnpm       |
| **AI**              | @mariozechner/pi-ai (unified LLM API with Zod output) |

## Key Directories

```
server/src/
├── app/              # App-specific features (domain modules)
│   └── todo/         # Example: todo feature module
│       ├── todo.routes.ts
│       ├── todo.controller.ts
│       ├── todo.service.ts
│       ├── todo.validation.ts
│       ├── todo.model.ts
│       ├── todo.jobs.ts
│       └── index.ts
├── shared/           # Shared/reusable features
│   ├── auth/         # Authentication (login, register, users)
│   ├── passkey/      # WebAuthn passwordless auth
│   ├── jobs/         # Background job API routes
│   ├── storage/      # File storage (S3)
│   ├── settings/     # App key-value settings
│   └── ai/           # AI inference endpoints
├── core/             # Core infrastructure
│   ├── ai/           # AI client, schema conversion
│   ├── errors/       # Boom errors, error codes, Prisma handler
│   ├── job/          # Job queue (client, queries, queue, worker)
│   ├── kv/           # Key-value store with Keyv
│   ├── logger/       # Pino logger with context management
│   ├── middlewares/  # Express middlewares
│   ├── storage/      # S3 storage service
│   └── utils/        # Shared utilities (router, controller helpers)
├── routes.ts         # Central route registration
└── index.ts          # Server entry point

client/src/
├── ui/               # Design system (pure shadcn/ui primitives, zero business logic)
├── core/             # Boilerplate infrastructure (synced to downstream repos)
│   ├── components/   # Layout shell, ProtectedRoute, CommandPalette, AppSettings, PasskeyManager
│   │   └── layout/   # PageLayout, PageHeader, PageContainer, Section
│   ├── hooks/        # use-toast
│   ├── lib/          # API client (apiClient + axios), AI client, utils, design tokens
│   ├── services/     # Passkey service, Settings service
│   ├── store/        # Zustand stores (auth, ai)
│   └── types/        # Shared types (ai.ts, jobs.ts)
├── app/              # Business feature modules (unique per downstream project)
│   ├── todo/         # Example: todo feature module
│   │   ├── pages/
│   │   └── hooks/
│   ├── ai/           # AI chat feature
│   ├── jobs/         # Job management
│   ├── storage/      # File storage
│   ├── settings/     # Settings page
│   └── auth/         # Login page
├── App.tsx           # Route definitions
├── main.tsx          # Entry point
└── index.css         # Global styles / Tailwind

tests/               # Centralized test files
├── server/          # Server unit tests (mirrors server/src structure)
│   ├── setup.ts     # Server test setup
│   ├── core/        # Core utility tests
│   └── services/    # Service tests
└── client/          # Client unit tests (mirrors client/src structure)
    ├── setup.ts     # Client test setup
    └── components/  # Component tests

docs/                # Documentation files
prisma/              # Database schema and migrations
```

## Common Commands

```bash
# Development
pnpm dev              # Start dev server (server + Vite middleware)
pnpm dev:docker       # Start with Docker PostgreSQL

# Database
pnpm prisma generate  # Generate Prisma client
pnpm prisma:push      # Push schema to database

# Build & Production
pnpm build            # Build client (Vite) + server (esbuild)
pnpm start            # Run production build

# Code Quality
pnpm lint             # Lint with Vite+ (Oxlint)
pnpm format           # Format with Vite+ (Oxfmt)
pnpm check            # Lint and format check

# Testing
pnpm test             # Run Vitest unit tests
pnpm test:watch       # Run tests in watch mode
pnpm test:e2e         # Run Playwright E2E tests
```

## Code Patterns

### Frontend Architecture

Three-layer separation for clean sync with downstream repos:

| Layer   | Import path              | Purpose                                                        | Synced? |
| ------- | ------------------------ | -------------------------------------------------------------- | ------- |
| `ui/`   | `@/ui/button`            | Pure design system primitives                                  | Yes     |
| `core/` | `@/core/lib/api`         | Boilerplate infrastructure (auth, API client, stores, layouts) | Yes     |
| `app/`  | `@/app/todo/pages/Todos` | Business feature modules                                       | No      |

**Dependency rule:** `ui/` must not import from `core/` or `app/`. `core/` must not import from `app/`. `app/` can import from both `ui/` and `core/`.

### Frontend Feature Module Structure

Each feature in `app/` is self-contained. Subdirectories are added as needed:

```
app/<feature>/
├── pages/       # Route-level page components (required)
├── hooks/       # React Query data hooks (if the feature has API calls)
└── types/       # Feature-specific TypeScript types (if used by 3+ consumers)
```

**Example — adding a new feature:**

```typescript
// app/invoices/pages/Invoices.tsx
import { Button } from "@/ui/button";
import { PageLayout } from "@/core/components/layout/PageLayout";
import { useInvoices } from "@/app/invoices/hooks/useInvoices";

export function Invoices() {
  const { data } = useInvoices();
  return (
    <PageLayout title="Invoices" description="Manage invoices">
      {/* ... */}
    </PageLayout>
  );
}
```

Then register the route in `App.tsx`:

```typescript
import { Invoices } from "@/app/invoices/pages/Invoices";
// Add inside the protected routes:
<Route path="invoices" element={<Invoices />} />
```

### Backend Feature Module Structure

Each feature is self-contained with:

- `*.routes.ts` - Route definitions using `createRouter()`
- `*.controller.ts` - Request handlers (simple async functions)
- `*.service.ts` - Business logic
- `*.validation.ts` - Zod schemas for input validation
- `*.model.ts` - Prisma queries and data access
- `*.jobs.ts` - Background job handlers (if applicable)
- `index.ts` - Feature exports

### Backend Architecture

- **Routes** → Use `createRouter()` which auto-wraps handlers
- **Controllers** → Simple async functions that return values (auto-serialized)
- **Services** → Business logic, database access via Prisma
- **Models** → Prisma client queries

### Request Flow

```
Route (createRouter + validation middleware)
  → Controller (async function returning value)
    → Service (business logic)
      → Prisma (database)
  → handle middleware auto-serializes response
```

### Route Definition Pattern

```typescript
import { createRouter } from "@/core/utils/router.utils";
import * as controller from "./feature.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import { createSchema } from "./feature.validation";

const router = createRouter();

router.get("/", controller.getAll);
router.post("/", validate(createSchema, "body"), controller.create);
router.get("/:id", controller.getById);

export default router;
```

### Controller Pattern

Controllers are simple async functions that return values:

```typescript
import type { Request, Response } from "express";
import * as Service from "./feature.service";
import { parseId } from "@/core/utils/controller.utils";

export async function create(req: Request, res: Response) {
  const payload = req.validated?.body || req.body;
  res.status(201); // Set status if needed
  return await Service.create({ data: payload });
}

export async function getById(req: Request) {
  const id = parseId(req.params.id);
  return await Service.findById({ id });
}
```

### Error Handling

Use `Boom` from `@/core/errors` for HTTP errors:

```typescript
import { Boom } from "@/core/errors";

// Factory methods
throw Boom.notFound("Todo not found");
throw Boom.badRequest("Invalid input");
throw Boom.unauthorized("Token expired");
throw Boom.forbidden("Access denied");
```

Prisma errors are automatically handled by `PrismaHandler`.

### Validation

- All request bodies validated with Zod schemas
- Use `validate(schema, "body" | "params" | "query")` middleware
- Validated data available at `req.validated.body/params/query`

### Authentication

- **JWT**: `jwtAuthMiddleware` for protected API routes
- **Admin**: `adminAuthMiddleware` for admin-only routes (X-Admin-Auth header)
- **Passkeys**: WebAuthn-based passwordless auth

### Job Registration

Jobs are registered dynamically in feature modules:

```typescript
// feature.jobs.ts
import { registerJobHandler, type JobHandler } from "@/core/job";
import { JobName } from "./feature.validation";

export const myJobHandler: JobHandler<MyPayload> = async ({ data }) => {
  // Job logic
};

export function registerFeatureJobs(): void {
  registerJobHandler(JobName.MY_JOB, myJobHandler);
}

// Then add to routes.ts registerJobHandlers()
```

## API Endpoints Summary

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

## Environment Variables

Key variables (see `.env.schema` for full list):

```bash
# Core
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=your-secret
ADMIN_AUTH_KEY=admin-key

# File Storage (S3)
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

# Passkeys
RP_ID=localhost
RP_NAME=Groot

# AI Provider API Keys (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
```

## Testing

### Unit Tests (Vitest)

- Located in centralized `tests/` directory
- Server tests in `tests/server/` mirror `server/src/` structure
- Client tests in `tests/client/` mirror `client/src/` structure
- Use `@/` alias for imports (resolves to server/src or client/src based on workspace)
- Run with `pnpm test`
- Uses `@testing-library/react` for component tests

### E2E Tests (Playwright)

- Located in `e2e/` directory
- Run with `pnpm test:e2e`
- Tests real user flows in browser

## Conventions

- **TypeScript**: Strict mode enabled
- **Imports**: Use `@/` alias (resolves to `server/src/` or `client/src/` based on workspace)
- **Frontend imports**: `@/ui/*` for design system, `@/core/*` for infrastructure, `@/app/*` for features
- **Frontend data hooks**: Use `apiClient` from `@/core/lib/api` (not the raw `api` axios instance)
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Exports**: Prefer named exports over default exports (use `* as` for controllers)
- **Async**: Always use async/await, never raw Promises
- **Errors**: Use `Boom` factory methods for HTTP errors

## Git Hooks

The project uses Vite+ git hooks (`.vite-hooks/pre-commit`):

- **Gitleaks**: Secret detection on staged files
- **Vite+ `vp staged`**: Linting and formatting on staged files

Install hooks: `pnpm prepare` (runs `vp config`)

## Quick Start for AI Assistants

1. Read this file and `docs/setup-guide.md` for context
2. Check `prisma/schema.prisma` for data models
3. Review existing patterns in similar feature modules before creating new ones
4. Use `createRouter()` for routes, simple async functions for controllers
5. Use `Boom` for HTTP errors, Zod for validation
6. Run `pnpm check` and `pnpm test` before suggesting changes
7. Ensure environment variables are documented when adding new features
