# Client

A Vite + React 19 SPA that consumes the Express API through Axios and React
Query.

## Routing & layout

Routes are defined in `apps/web/src/client/App.tsx`:

| Route                   | Component            | Auth      |
| ----------------------- | -------------------- | --------- |
| `/login`                | `Login`              | Public    |
| `/` → `/todos` (index)  | `Todos`              | Protected |
| `/storage`              | `Storage`            | Protected |
| `/jobs`, `/jobs/:q/:id` | `Jobs` / `JobDetail` | Protected |
| `/settings`             | `Settings`           | Protected |

`ProtectedRoute` checks `useAuthStore` and redirects unauthenticated users to
`/login`. `Layout` renders the nav bar, user info, and an `<Outlet>` for nested
routes.

## Authentication flow

The app uses **JWT auth** (not basic auth):

1. `pages/Login.tsx` posts credentials to `/api/v1/auth/login` → receives a
   `{ token, user }` response.
2. `useAuthStore` (Zustand) stores the JWT in `localStorage` under `auth`.
3. `@groot/shell/lib/api` (the shared Axios instance) reads the token in a
   request interceptor and injects `Authorization: Bearer <token>` on every
   request. A response interceptor logs the user out on `401`.

## Data fetching

- React Query is mounted globally.
- Feature hooks (e.g. `useTodos`) wrap list + CRUD mutations and invalidate
  caches after each mutation.
- Errors surface via `useToast` (Sonner) for immediate UI feedback.

## UI system

- **Tailwind CSS** + `tailwindcss-animate`, configured in `packages/shell`.
- **shadcn-style primitives** (`Button`, `Card`, `Dialog`, `Input`, …) live in
  the [`@groot/ui`](../../packages/ui) package.
- Pages compose these with React Query hooks to render server data.

## Layering (import rules)

| Layer              | Import path            | Purpose           | Synced? |
| ------------------ | ---------------------- | ----------------- | ------- |
| `@groot/ui`        | `@groot/ui/button`     | Design primitives | Yes     |
| `@groot/shell`     | `@groot/shell/lib/api` | Client infra      | Yes     |
| `apps/web/…/pages` | `./pages/todo/Todos`   | Business features | No      |

`ui/` can't import `shell`/`pages`; `shell/` can't import `pages/`.

## Extending the client

1. Add a route in `App.tsx` (nest under `ProtectedRoute` if it needs auth).
2. Create a React Query hook in the feature's `hooks/` that calls `/api/v1/*`.
3. Compose the UI in `pages/`, using the shared layout + toasts.
4. For global state, prefer Zustand slices or React Query caches over ad-hoc
   contexts.
