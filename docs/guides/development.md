# Development Workflow

Day-to-day commands, coding conventions, and the steps for adding a new feature end to end.

## Core Commands

```bash
pnpm dev              # Express + Vite dev servers (hot reload)
pnpm lint             # Vite+ (Oxlint) linting
pnpm format           # Vite+ (Oxfmt) formatting
pnpm check            # Lint and format check
pnpm test             # Vitest run (server + client)
pnpm build            # Vite client + server bundling via esbuild
pnpm start            # Runs dist/bundle.js with NODE_ENV=production
```

Prisma helpers:

```bash
pnpm prisma generate  # Explicit regeneration (also runs on postinstall)
pnpm db:migrate        # Apply pending migrations (migrate deploy)
```

## Coding Conventions

| Convention            | Detail                                                                               |
| --------------------- | ------------------------------------------------------------------------------------ |
| TypeScript everywhere | Path aliases in `tsconfig.json`: `@groot/core/*` (server), `@groot/shell/*` (client) |
| Validate first        | Use `parseBody`, `parseQuery`, `parseParams` in route handlers                       |
| Return values         | Handlers return values directly; `createRouter` handles serialization                |
| Boom errors           | `Boom.notFound()`, `Boom.badRequest()`, etc. for HTTP errors                         |
| Logging               | Use `@groot/core/logger`; avoid `console.log`                                        |
| Minimal comments      | Favor clear code over extensive documentation                                        |
| Auth guard            | Use `jwtAuthMiddleware` for protected routes                                         |

## Adding a New Feature

### 1. Create Feature Directory

```bash
mkdir -p apps/web/src/server/api/myfeature
```

### 2. Define Validation Schema

```typescript
// apps/web/src/server/api/myfeature/myfeature.schema.ts
import { z } from "zod";

export const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export type CreateDTO = z.infer<typeof createSchema>;
```

### 3. Create Service

```typescript
// apps/web/src/server/api/myfeature/myfeature.service.ts
import { prisma } from "@groot/core/database";
import { Boom } from "@groot/core/errors";
import type { CreateDTO } from "./myfeature.schema";

export async function create({ data }: { data: CreateDTO }) {
  return prisma.myfeature.create({ data });
}

export async function findAll() {
  return prisma.myfeature.findMany();
}

export async function findById({ id }: { id: number }) {
  const item = await prisma.myfeature.findUnique({ where: { id } });
  if (!item) {
    throw Boom.notFound("MyFeature not found");
  }
  return item;
}
```

### 4. Create Routes

```typescript
// apps/web/src/server/api/myfeature/myfeature.routes.ts
import type { Request, Response } from "express";
import { createRouter } from "@groot/core/utils/router.utils";
import { parseId, parseBody } from "@groot/core/utils/controller.utils";
import * as service from "./myfeature.service";
import { createSchema } from "./myfeature.schema";

const router = createRouter();

router.get("/", async () => {
  return await service.findAll();
});

router.post("/", async (req: Request, res: Response) => {
  const payload = parseBody(req, createSchema);
  res.status(201);
  return await service.create({ data: payload });
});

router.get("/:id", async (req: Request) => {
  const id = parseId(req.params.id);
  return await service.findById({ id });
});

export default router;
```

### 5. Register Routes

```typescript
// apps/web/src/server/routes.ts
import myFeatureRoutes from "./api/myfeature/myfeature.routes";

export function registerRoutes(app: Express): void {
  // ... existing routes
  protectedRouter.use("/myfeature", myFeatureRoutes);
}
```

### 6. Add Tests

```typescript
// tests/server/api/myfeature/myfeature.routes.test.ts
import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import myFeatureRoutes from "./api/myfeature/myfeature.routes";

// Mock the service
vi.mock("./api/myfeature/myfeature.service", () => ({
  findAll: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue({ id: 1 }),
}));

describe("MyFeature Routes", () => {
  const app = express();
  app.use(express.json());
  app.use("/myfeature", myFeatureRoutes);

  it("GET /myfeature returns array", async () => {
    const res = await request(app).get("/myfeature");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

## Adding Background Jobs

### 1. Define Job Types

```typescript
// myfeature.schema.ts
export interface MyJobPayload {
  itemId: number;
}
```

### 2. Create Job Handler

```typescript
// apps/web/src/server/api/myfeature/myfeature.jobs.ts
import { registerJobHandler, type JobHandler } from "@groot/jobs/server";
import type { MyJobPayload } from "./myfeature.schema";

export const myJobHandler: JobHandler<MyJobPayload> = async ({ data }) => {
  const { itemId } = data;
  // Job logic here
};

export function registerMyFeatureJobs(): void {
  registerJobHandler("my-feature-job", myJobHandler);
}
```

### 3. Register Jobs

```typescript
// apps/web/src/server/routes.ts
import { registerMyFeatureJobs } from "./api/myfeature/myfeature.jobs";

export function registerJobHandlers(): void {
  registerMyFeatureJobs();
  // ... other job registrations
}
```

## Client Development Tips

| Concern           | Where                              |
| ----------------- | ---------------------------------- |
| Routes            | `App.tsx` (React Router)           |
| Data fetching     | Hooks in `hooks/api` (React Query) |
| Auth state        | `useAuthStore` (Zustand)           |
| UI components     | `@groot/ui`                        |
| Layout components | `@groot/shell/components/layout`   |

## Iteration Loop

1. Run `pnpm dev`
2. Update feature code
3. Run `pnpm test` for targeted coverage
4. Run `pnpm check` before committing
5. Update docs if behavior changes
