# Testing Guide

Vitest powers the unit/integration tests while Supertest handles HTTP assertions. Tests are centralized in the `tests/` directory.

## Commands

```bash
pnpm test         # Single run, great for CI
pnpm test:watch   # Watch mode during development
pnpm test:e2e     # Playwright E2E tests
```

## Test Structure

```
tests/
├── server/              # Server unit tests
│   ├── setup.ts         # Server test setup
│   ├── core/            # Core utility tests
│   │   ├── job/         # Job system tests
│   │   └── utils/       # Utility tests
│   └── app/             # Feature tests (mirror server/src/app)
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
import todoRoutes from "@/app/todo/todo.routes";

vi.mock("@/app/todo/todo.service", () => ({
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
    const res = await request(app)
      .post("/todos")
      .send({ title: "New Todo" });
    expect(res.status).toBe(201);
  });

  it("POST /todos with invalid data returns 400", async () => {
    const res = await request(app)
      .post("/todos")
      .send({});
    expect(res.status).toBe(400);
  });
});
```

### Service Tests

Test business logic directly:

```typescript
// tests/server/app/todo/todo.service.test.ts
import { describe, it, expect, vi } from "vitest";
import * as TodoService from "@/app/todo/todo.service";

vi.mock("@/app/todo/todo.model", () => ({
  findAll: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue({ id: 1 }),
}));

describe("TodoService", () => {
  it("findAll returns todos", async () => {
    const todos = await TodoService.findAll();
    expect(Array.isArray(todos)).toBe(true);
  });
});
```

### Job Handler Tests

Test job handlers with mock job objects:

```typescript
// tests/server/app/todo/todo.jobs.test.ts
import { describe, it, expect, vi } from "vitest";
import { todoCleanupHandler } from "@/app/todo/todo.jobs";

vi.mock("@/core/logger", () => ({
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
import { vi } from "vitetest";

vi.mock("@/core/database", () => ({
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
vi.mock("@/core/job", () => ({
  addJob: vi.fn().mockResolvedValue("job-id"),
  scheduleJob: vi.fn().mockResolvedValue("scheduled-id"),
  getJobs: vi.fn().mockResolvedValue([]),
  registerJobHandler: vi.fn(),
}));
```

### Logger Mocking

```typescript
vi.mock("@/core/logger", () => ({
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
import { Button } from "@/components/ui/button";

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
- Run `pnpm test` to verify tests pass
- Add CI (GitHub Actions) to enforce checks automatically
