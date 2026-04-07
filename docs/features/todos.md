# Todos Feature

The todo domain demonstrates the recommended feature module pattern with self-contained validation, controllers, services, models, and jobs.

## Module Structure

```
server/src/app/todo/
├── todo.routes.ts       # Route definitions
├── todo.controller.ts   # Request handlers
├── todo.service.ts      # Business logic
├── todo.validation.ts   # Zod schemas
├── todo.model.ts        # Prisma queries
├── todo.jobs.ts         # Background jobs
└── index.ts             # Exports
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
// todo.validation.ts
export const createTodoSchema = z.object({
  title: z.string().min(1),
  completed: z.boolean().optional().default(false),
});

export const updateTodoSchema = createTodoSchema.partial();

export type CreateTodoDTO = z.infer<typeof createTodoSchema>;
export type UpdateTodoDTO = z.infer<typeof updateTodoSchema>;
```

Controllers return values directly (auto-serialized by `createRouter`).

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
import { createRouter } from "@/core/utils/router.utils";
import * as todoController from "./todo.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import { createTodoSchema, updateTodoSchema } from "./todo.validation";

const router = createRouter();

router.get("/", todoController.getAll);
router.post("/", validate(createTodoSchema, "body"), todoController.create);
router.get("/:id", todoController.getById);
router.put("/:id", validate(updateTodoSchema, "body"), todoController.update);
router.delete("/:id", todoController.deleteTodo);

export default router;
```

### Controller

```typescript
// todo.controller.ts
import type { Request, Response } from "express";
import * as TodoService from "./todo.service";
import { parseId } from "@/core/utils/controller.utils";
import type { CreateTodoDTO, UpdateTodoDTO } from "./todo.validation";

export async function getAll() {
  return await TodoService.findAll();
}

export async function create(req: Request, res: Response) {
  const payload = (req.validated?.body || req.body) as CreateTodoDTO;
  res.status(201);
  return await TodoService.create({ data: payload });
}

export async function getById(req: Request) {
  const id = parseId(req.params.id);
  return await TodoService.findById({ id });
}
```

### Service

```typescript
// todo.service.ts
import * as TodoModel from "./todo.model";
import type { CreateTodoDTO, UpdateTodoDTO } from "./todo.validation";
import { Boom } from "@/core/errors";

export async function create({ data }: { data: CreateTodoDTO }) {
  return TodoModel.create(data);
}

export async function findById({ id }: { id: number }) {
  const todo = await TodoModel.findById(id);
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
import { registerJobHandler, type JobHandler } from "@/core/job";

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
import { registerTodoJobs } from "@/app/todo/todo.jobs";

export function registerJobHandlers(): void {
  registerTodoJobs();
}
```

## React Integration

- `client/src/lib/api.ts` - API client with JWT auth
- `client/src/hooks/api/useTodos.ts` - React Query hooks
- `client/src/pages/Todos.tsx` - Todo page component

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
