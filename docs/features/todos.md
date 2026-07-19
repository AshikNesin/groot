# Todos Feature

The todo domain demonstrates the recommended feature module pattern with self-contained validation, services, and jobs.

## Module Structure

```
apps/web/src/server/api/todo/
├── todo.routes.ts       # Route definitions + inline request handlers
├── todo.service.ts      # Business logic (calls Prisma directly)
├── todo.schema.ts   # Zod schemas
└── todo.jobs.ts         # Background jobs
```

## API Surface

All routes are mounted under `/api/v1/todos` and require JWT authentication.

| Method   | Path   | Description               |
| -------- | ------ | ------------------------- |
| `POST`   | `/`    | Create a todo             |
| `GET`    | `/`    | List todos (latest first) |
| `GET`    | `/:id` | Fetch a single todo       |
| `PUT`    | `/:id` | Update title/completion   |
| `DELETE` | `/:id` | Remove a todo             |

### Request/Response Shape

```typescript
// todo.schema.ts
export const createTodoSchema = z.object({
  title: z.string().min(1),
  completed: z.boolean().optional().default(false),
});

export const updateTodoSchema = createTodoSchema.partial();

export type CreateTodoDTO = z.infer<typeof createTodoSchema>;
export type UpdateTodoDTO = z.infer<typeof updateTodoSchema>;
```

Route handlers return values directly (auto-serialized by `createRouter`).

### Example Requests

```bash
# Create
curl -H "Authorization: Bearer <token>" \
  -X POST https://groot.localhost/api/v1/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Ship docs"}'

# Toggle completion
curl -H "Authorization: Bearer <token>" \
  -X PUT https://groot.localhost/api/v1/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# Delete
curl -H "Authorization: Bearer <token>" \
  -X DELETE https://groot.localhost/api/v1/todos/1
```

Validation errors use Boom:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required"
  }
}
```

## Implementation

### Routes

```typescript
// todo.routes.ts
import type { Request, Response } from "express";
import { createRouter } from "@groot/core/utils/router.utils";
import { parseId, parseBody } from "@groot/core/utils/controller.utils";
import * as todoService from "./todo.service";
import { createTodoSchema, updateTodoSchema } from "./todo.schema";

const router = createRouter();

router.post("/", async (req: Request, res: Response) => {
  const payload = parseBody(req, createTodoSchema);
  res.status(201);
  return await todoService.create({ data: payload });
});

router.get("/", async () => {
  return await todoService.findAll();
});

router.get("/:id", async (req: Request) => {
  const id = parseId(req.params.id);
  return await todoService.findById({ id });
});

router.put("/:id", async (req: Request) => {
  const id = parseId(req.params.id);
  const payload = parseBody(req, updateTodoSchema);
  return await todoService.update({ id, data: payload });
});

router.delete("/:id", async (req: Request) => {
  const id = parseId(req.params.id);
  return await todoService.deleteTodo({ id });
});

export default router;
```

### Service

```typescript
// todo.service.ts
import { prisma } from "@groot/core/database";
import { Boom } from "@groot/core/errors";
import type { CreateTodoDTO, UpdateTodoDTO } from "./todo.schema";

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

## Background Jobs

Defined in `todo.jobs.ts`:

| Job            | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| `todo-cleanup` | Deletes completed todos older than `daysToKeep` (default 30) |
| `todo-summary` | Logs aggregate stats (total, completed, pending)             |

```typescript
// todo.jobs.ts
import { registerJobHandler, type JobHandler } from "@groot/jobs/server";

export const cleanupHandler: JobHandler<CleanupPayload> = async ({ data }) => {
  const { daysToKeep = 30 } = data;
  // Cleanup logic
};

export function registerTodoJobs(): void {
  registerJobHandler("todo-cleanup", cleanupHandler);
}
```

Jobs are registered in `routes.ts`:

```typescript
import { registerTodoJobs } from "./api/todo/todo.jobs";

export function registerJobHandlers(): void {
  registerTodoJobs();
}
```

## React Integration

- `@groot/shell/lib/api` - API client with JWT auth
- `apps/web/src/client/pages/todo/hooks/useTodos.ts` - React Query hooks
- `apps/web/src/client/pages/todo/pages/Todos.tsx` - Todo page component

The client automatically refetches the todo list after mutations via `queryClient.invalidateQueries`.

## Database Schema

```prisma
model Todo {
  id        Int      @id @default(autoincrement())
  title     String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```
