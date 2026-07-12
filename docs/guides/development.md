# Development Workflow

## Core Commands

```bash
pnpm dev              # Express + Vite dev servers (hot reload)
pnpm dev:docker       # Start with Docker PostgreSQL
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

- **TypeScript everywhere** – Path aliases defined in `tsconfig.json` (`@groot/core/*` for server, `@groot/shell/*` for client)
- **Validation first** – Use `validate(zodSchema, "body")` middleware on routes
- **Return values** – Controllers return values directly, `createRouter` handles serialization
- **Boom errors** – Use `Boom.notFound()`, `Boom.badRequest()`, etc. for HTTP errors
- **Logging** – Use logger from `@groot/core/logger` for structured events; avoid `console.log`
- **Minimal comments** – Favor clear code over extensive documentation
- **Auth guard** – Use `jwtAuthMiddleware` for protected routes

## Adding a New Feature

### 1. Create Feature Directory

```bash
mkdir -p apps/web/src/server/api/myfeature
```

### 2. Define Validation Schema

```typescript
// apps/web/src/server/api/myfeature/myfeature.validation.ts
import { z } from "zod";

export const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export type CreateDTO = z.infer<typeof createSchema>;
```

### 3. Create Model

```typescript
// apps/web/src/server/api/myfeature/myfeature.model.ts
import { prisma } from "@groot/core/database";
import type { CreateDTO } from "./myfeature.validation";

export async function create(data: CreateDTO) {
  return prisma.myfeature.create({ data });
}

export async function findAll() {
  return prisma.myfeature.findMany();
}
```

### 4. Create Service

```typescript
// apps/web/src/server/api/myfeature/myfeature.service.ts
import * as Model from "./myfeature.model";
import type { CreateDTO } from "./myfeature.validation";

export async function create({ data }: { data: CreateDTO }) {
  return Model.create(data);
}

export async function findAll() {
  return Model.findAll();
}
```

### 5. Create Controller

```typescript
// apps/web/src/server/api/myfeature/myfeature.controller.ts
import type { Request, Response } from "express";
import * as Service from "./myfeature.service";
import { parseId } from "@groot/core/utils/controller.utils";

export async function getAll() {
  return await Service.findAll();
}

export async function create(req: Request, res: Response) {
  const payload = req.validated?.body || req.body;
  res.status(201);
  return await Service.create({ data: payload });
}

export async function getById(req: Request) {
  const id = parseId(req.params.id);
  return await Service.findById({ id });
}
```

### 6. Create Routes

```typescript
// apps/web/src/server/api/myfeature/myfeature.routes.ts
import { createRouter } from "@groot/core/utils/router.utils";
import * as controller from "./myfeature.controller";
import { validate } from "@groot/core/middlewares/validation.middleware";
import { createSchema } from "./myfeature.validation";

const router = createRouter();

router.get("/", controller.getAll);
router.post("/", validate(createSchema, "body"), controller.create);
router.get("/:id", controller.getById);

export default router;
```

### 7. Register Routes

```typescript
// apps/web/src/server/routes.ts
import myFeatureRoutes from "./api/myfeature/myfeature.routes";

export function registerRoutes(app: Express): void {
  // ... existing routes
  protectedRouter.use("/myfeature", myFeatureRoutes);
}
```

### 8. Add Tests

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
// myfeature.validation.ts
export interface MyJobPayload {
  itemId: number;
}
```

### 2. Create Job Handler

```typescript
// apps/web/src/server/api/myfeature/myfeature.jobs.ts
import { registerJobHandler, type JobHandler } from "@groot/jobs/server";
import type { MyJobPayload } from "./myfeature.validation";

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

- Use React Router routes defined in `App.tsx`
- Fetch data through hooks in `hooks/api` with React Query
- Store auth state via `useAuthStore` (Zustand)
- Use UI components from `@groot/ui`
- Use layout components from `@groot/shell/components/layout`

## Iteration Loop

1. Run `pnpm dev`
2. Update feature code
3. Run `pnpm test` for targeted coverage
4. Run `pnpm check` before committing
5. Update docs if behavior changes
