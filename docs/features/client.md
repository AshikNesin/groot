# Client Feature

The client is a Vite + React 19 SPA that consumes the Express API through Axios and React Query.

## Routing & Layout

- `client/src/App.tsx` defines routes: `/login`, `/` (Dashboard), and `/todos`.
- `ProtectedRoute` checks `useAuthStore` for authentication; unauthenticated users are redirected to `/login`.
- `Layout` renders the navigation bar, user info, and `Outlet` for nested routes.

## Authentication Flow

- `useAuthStore` (Zustand) stores a base64 Basic Auth token in `localStorage` under `auth`.
- `lib/api.ts` reads this token in an Axios interceptor and injects `Authorization: Basic <token>` for every request.
- `pages/Login.tsx` handles form submission, calls `useAuthStore.login`, and redirects to the dashboard.

## Data Fetching

- React Query lives globally; `hooks/api/useTodos.ts` manages todos (list + CRUD mutations) and invalidates caches after each mutation.
- Errors surface through `useToast` + `components/ui/toaster`, giving immediate UI feedback.

## UI System

- Tailwind CSS + `tailwindcss-animate` deliver styling, configured via `tailwind.config.js` and `client/src/index.css`.
- shadcn-inspired primitives (Button, Card, Dialog, Input, etc.) live under `components/ui` for consistency.
- Pages such as `Dashboard.tsx` and `Todos.tsx` combine these components with React Query hooks to display server data.

## Extending the Client

1. Add a route under `App.tsx` (nested inside `ProtectedRoute` if it needs auth).
2. Create hooks inside `hooks/api` that call `/api/v1/*` endpoints.
3. Compose UI in `components` or `pages`, leveraging global layout + toasts.
4. For new global state, prefer Zustand slices or React Query caches over ad-hoc contexts.

## Local Development

`pnpm dev` starts the Express server with Vite middleware. The client can import server-relative paths (e.g., `@/components/...`) thanks to Vite + TypeScript path aliases.

Use this document as a checklist when building new client features so routing, auth, and data patterns stay uniform.
