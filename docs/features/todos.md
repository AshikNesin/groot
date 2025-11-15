# Todos Feature

The todo domain demonstrates the recommended CRUD patterns across validation, controllers, services, models, and React consumption.

## API Surface

All routes are mounted under `/api/v1/todos` and require Basic Auth.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/` | Create a todo |
| `GET` | `/` | List todos (latest first) |
| `GET` | `/:id` | Fetch a single todo |
| `PUT` | `/:id` | Update title/completion |
| `DELETE` | `/:id` | Remove a todo |

### Request/Response Shape

Schemas live in `server/src/validations/todo.validation.ts`.

```ts
type CreateTodoDTO = {
  title: string;      // required
  completed?: boolean; // defaults to false
};

type UpdateTodoDTO = Partial<CreateTodoDTO>;
```

Responses use `ResponseHandler`, so success payloads follow `{ success: true, data: <entity>, message? }`.

### Example Requests

```bash
# Create
curl -u user:pass -X POST http://localhost:3000/api/v1/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Ship docs"}'

# Toggle completion
curl -u user:pass -X PUT http://localhost:3000/api/v1/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# Delete
curl -u user:pass -X DELETE http://localhost:3000/api/v1/todos/1
```

Expect validation errors like:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required"
  }
}
```

## Implementation Path

| Layer | File |
| --- | --- |
| Validation | `server/src/validations/todo.validation.ts` |
| Controller | `server/src/controllers/todo.controller.ts` |
| Service | `server/src/services/todo.service.ts` |
| Model | `server/src/models/todo.model.ts` |
| Routes | `server/src/routes/todo.routes.ts` |

`BaseController` enforces numeric IDs, while `todoService` throws `NotFoundError` if records are missing. All Prisma calls are wrapped in `todoModel` for testability.

## React Integration

- Axios is configured in `client/src/lib/api.ts` with `/api/v1` base URL and Basic Auth header injection.
- `hooks/api/useTodos.ts` exposes `useTodos`, `useCreateTodo`, `useUpdateTodo`, and `useDeleteTodo` hooks built on React Query.
- `pages/Todos.tsx` consumes these hooks, renders cards with Tailwind/shadcn components, and mirrors API errors using toast notifications.
- The client automatically refetches the todo list after mutations via `queryClient.invalidateQueries`.

## Database Considerations

- Prisma model `todo` stores `title`, `completed`, `createdAt`, and `updatedAt` fields.
- `todoCleanup` job (see [Background Jobs](./jobs.md)) prunes completed todos older than a configurable cutoff, keeping the table tidy.
