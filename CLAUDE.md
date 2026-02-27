# Express + React Boilerplate - AI Development Context

This file provides context for AI assistants (like Claude) working on this codebase.

## Project Overview

A production-ready SaaS boilerplate combining Express.js backend with React frontend. Built with TypeScript, Prisma, PostgreSQL, and a complete UI component library.

## Tech Stack

| Area | Technologies |
|------|-------------|
| **Backend** | Node.js, Express 5, TypeScript, Prisma, PostgreSQL |
| **Auth** | JWT (bcryptjs), Passkeys (@simplewebauthn/server) |
| **File Storage** | AWS S3 SDK (@aws-sdk/client-s3) |
| **Background Jobs** | pg-boss (PostgreSQL-backed queue) |
| **Key-Value Store** | Keyv with PostgreSQL adapter |
| **Logging** | Pino, Sentry |
| **File Uploads** | Multer |
| **Frontend** | React 19, TypeScript, Vite 7 |
| **UI** | Radix UI primitives, Tailwind CSS, shadcn/ui patterns |
| **State** | Zustand, React Query |
| **Routing** | React Router 7 |
| **Tooling** | Biome (linting/formatting), Vitest, Playwright, pnpm |

## Key Directories

```
server/src/
├── controllers/     # Request handlers (thin layer)
├── services/        # Business logic (fat layer)
├── routes/          # API route definitions
├── middlewares/     # Express middlewares (auth, validation, rate-limiting)
├── core/            # Shared utilities (errors, logger, jobs, storage)
├── models/          # Prisma client exports and data models
├── validations/     # Zod schemas for request validation
└── utils/           # Helper functions

client/src/
├── components/
│   ├── ui/          # 26 Radix-based UI components
│   └── layout/      # PageLayout, PageHeader, etc.
├── pages/           # Route-level page components
├── lib/             # API client, utilities
├── store/           # Zustand stores (auth, etc.)
└── hooks/           # Custom React hooks

docs/                # Documentation files
prisma/              # Database schema and migrations
```

## Common Commands

```bash
# Development
pnpm dev              # Start dev server (server + Vite middleware)
pnpm dev:pglite       # Start with PGlite (local DB)
pnpm dev:docker       # Start with Docker PostgreSQL

# Database
pnpm prisma generate  # Generate Prisma client
pnpm prisma:push      # Push schema to database
pnpm dev:studio       # Open Prisma Studio (if dev server running)

# Build & Production
pnpm build            # Build client (Vite) + server (esbuild)
pnpm start            # Run production build

# Code Quality
pnpm lint             # Lint with Biome
pnpm format           # Format with Biome

# Testing
pnpm test             # Run Vitest unit tests
pnpm test:watch       # Run tests in watch mode
pnpm test:e2e         # Run Playwright E2E tests
```

## Code Patterns

### Backend Architecture
- **Routes** → Define endpoints and apply middleware
- **Controllers** → Parse/validate request, call service, format response
- **Services** → Business logic, database access via Prisma
- **Models** → Re-export Prisma client types

### Request Flow
```
Route (validation middleware)
  → Controller (asyncHandler wrapper)
    → Service (business logic)
      → Prisma (database)
```

### Error Handling
- Throw `AppError` from `core/errors` for expected errors
- Errors automatically caught by `asyncHandler`
- Unexpected errors logged with Sentry breadcrumbs

### Validation
- All request bodies validated with Zod schemas in `validations/`
- Use `validate(schema, "body" | "params" | "query")` middleware

### Authentication
- **Basic Auth**: `basicAuthMiddleware` for API routes
- **JWT**: `jwtAuthMiddleware` for user sessions
- **Admin**: `adminAuthMiddleware` for admin-only routes (X-Admin-Auth header)
- **Passkeys**: WebAuthn-based passwordless auth

## API Endpoints Summary

| Prefix | Purpose | Auth |
|--------|---------|------|
| `/api/v1/todos` | CRUD operations | Basic Auth |
| `/api/v1/auth` | Login, logout, user management | Mixed |
| `/api/v1/storage` | File storage operations | Basic Auth |
| `/api/v1/public/files` | Public file sharing | None (rate-limited) |
| `/api/v1/jobs` | Background job management | Basic Auth |
| `/api/v1/passkeys` | Passkey registration/auth | JWT |
| `/api/v1/settings` | App key-value settings | None |

## Environment Variables

Key variables (see `.env.example` for full list):

```bash
# Core
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=your-secret
BASIC_AUTH_USERNAME=user
BASIC_AUTH_PASSWORD=pass
ADMIN_AUTH_KEY=admin-key

# File Storage (S3)
AWS_ACCESS_KEY_ID=localstack
AWS_SECRET_ACCESS_KEY=localstack
AWS_DEFAULT_REGION=us-east-1
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
RP_NAME=Express React Boilerplate
```

## Testing

### Unit Tests (Vitest)
- Located alongside source files as `*.test.ts`
- Run with `pnpm test`
- Uses `@testing-library/react` for component tests

### E2E Tests (Playwright)
- Located in `e2e/` directory
- Run with `pnpm test:e2e`
- Tests real user flows in browser

## Conventions

- **TypeScript**: Strict mode enabled
- **Imports**: Use `@/` alias for server/src paths
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Exports**: Prefer named exports over default exports
- **Async**: Always use async/await, never raw Promises
- **Errors**: Throw `AppError` with appropriate status code

## Quick Start for AI Assistants

1. Read this file and `docs/SETUP_GUIDE.md` for context
2. Check `prisma/schema.prisma` for data models
3. Review existing patterns in similar files before creating new ones
4. Run `pnpm lint` and `pnpm test` before suggesting changes
5. Ensure environment variables are documented when adding new features
