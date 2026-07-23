# Testing Guide

How to run the test suite, mock server dependencies, and keep tests passing on both database engines.

Vitest powers the unit/integration tests while Supertest handles HTTP assertions. Tests are centralized in the `tests/` directory.

## Commands

```bash
pnpm test         # Single run, great for CI (SQLite by default)
pnpm test:watch   # Watch mode during development
pnpm test:e2e     # Playwright E2E tests
```

## Running on both database engines

The suite is engine-agnostic and must pass on **both** SQLite and PostgreSQL.
Convenience scripts run each engine (and both together):

```bash
pnpm test:sqlite      # DATABASE_ENGINE=sqlite  → ./tmp/test.db
pnpm test:postgres    # DATABASE_ENGINE=postgres → isolated *_test DB
pnpm test:all         # both, sequentially
```

The `pretest` hook (`scripts/ensure-test-db.ts`) provisions the right test DB
for the active engine: it migrates a Postgres test DB reached via `DATABASE_URL`
(a pre-provisioned Postgres in CI, or your own local Postgres) and ensures the
`./tmp/test.db` file exists on SQLite. It also regenerates the Prisma client
for the active engine — the generated client embeds the datasource provider, so
switching engines without regenerating causes a runtime driver-adapter
mismatch.

CI enforces both engines on every PR and push to `main` via a matrix workflow
(`.github/workflows/test.yml`): the Postgres leg uses a `pgvector/pgvector:pg18`
service container, SQLite needs no infra. Each leg typechecks, lints, tests,
and builds. The honker-adapter test is SQLite-only (the adapter opens a SQLite
file) and is `describe.skip` on Postgres.

> See [Database Engines](../database-engines.md) for the full engine matrix.

## Test Structure

```
tests/
├── server/              # Server unit tests
│   ├── setup.ts         # Server test setup
│   ├── core/            # Core utility tests
│   │   ├── job/         # Job system tests
│   │   └── utils/       # Utility tests
│   └── app/             # Feature tests (mirror apps/web/src/server/api)
└── client/              # Client unit tests
    ├── setup.ts         # Client test setup
    └── components/      # Component tests
```

## Server Testing Patterns

### Route Tests

Test HTTP endpoints with Supertest:

```typescript
// tests/server/app/todo/todo.routes.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import todoRoutes from "../../../../apps/web/src/server/api/todo/todo.routes";

vi.mock("../../../../apps/web/src/server/api/todo/todo.service", () => ({
  findAll: vi.fn().mockResolvedValue([{ id: 1, title: "Test" }]),
  create: vi.fn().mockResolvedValue({ id: 1, title: "New" }),
}));

describe("Todo Routes", () => {
  const app = express();
  app.use(express.json());
  app.use("/todos", todoRoutes);

  it("GET /todos returns array", async () => {
    const res = await request(app).get("/todos");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("POST /todos with valid data creates todo", async () => {
    const res = await request(app).post("/todos").send({ title: "New Todo" });
    expect(res.status).toBe(201);
  });

  it("POST /todos with invalid data returns 400", async () => {
    const res = await request(app).post("/todos").send({});
    expect(res.status).toBe(400);
  });
});
```

### Service Tests

Test business logic directly:

```typescript
// tests/server/app/todo/todo.service.test.ts
import { describe, it, expect, vi } from "vitest";
import * as todoService from "../../../../apps/web/src/server/api/todo/todo.service";

vi.mock("@groot/core/database", () => ({
  prisma: {
    todo: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      findUnique: vi.fn().mockResolvedValue({ id: 1 }),
    },
  },
}));

describe("todoService", () => {
  it("findAll returns todos", async () => {
    const todos = await todoService.findAll();
    expect(Array.isArray(todos)).toBe(true);
  });
});
```

### Job Handler Tests

Test job handlers with mock job objects:

```typescript
// tests/server/app/todo/todo.jobs.test.ts
import { describe, it, expect, vi } from "vitest";
import { todoCleanupHandler } from "../../../../apps/web/src/server/api/todo/todo.jobs";

vi.mock("@groot/core/logger", () => ({
  createJobLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));

describe("Todo Jobs", () => {
  it("cleanup handler processes data", async () => {
    const job = { id: "test-123", data: { daysToKeep: 30 } };
    await expect(todoCleanupHandler(job)).resolves.toBeUndefined();
  });
});
```

## Mocking Tips

### Prisma Mocking

```typescript
import { vi } from "vitest";

vi.mock("@groot/core/database", () => ({
  prisma: {
    todo: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
    },
  },
}));
```

### Job System Mocking

```typescript
vi.mock("@groot/jobs/server/queue", () => ({
  addJob: vi.fn().mockResolvedValue("job-id"),
  scheduleJob: vi.fn().mockResolvedValue("scheduled-id"),
}));

vi.mock("@groot/jobs/server/queries", () => ({
  getJobs: vi.fn().mockResolvedValue([]),
}));

vi.mock("@groot/jobs/server/worker", () => ({
  registerJobHandler: vi.fn(),
}));
```

### Logger Mocking

```typescript
vi.mock("@groot/core/logger", () => ({
  createRequestLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
  createJobLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
  }),
}));
```

## HTTP Coverage Checklist

For each API route, cover:

1. **Success path** – Validate `201/200` responses and response body structure
2. **Validation errors** – Send malformed payloads to ensure validation rejects them
3. **Auth guard** – Assert that missing JWT returns `401` (for protected routes)
4. **Edge cases** – Missing resources, invalid IDs, pagination limits

## Client Testing

Use Vitest + `@testing-library/react`:

```typescript
// tests/client/components/ui/Button.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@groot/ui/button";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<Button disabled>Loading...</Button>);
    expect(screen.getByText("Loading...")).toBeDisabled();
  });
});
```

## Continuous Verification

- Run `pnpm check` (lint + format) before opening PRs
- Run `pnpm test:all` to verify tests pass on both database engines
- CI (`.github/workflows/test.yml`) enforces typecheck, lint, tests, and build on both SQLite and PostgreSQL automatically
