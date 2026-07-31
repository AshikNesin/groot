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

### Rules

The primitives below are the _only_ way to render these things. Hand-rolling a
replacement is what makes the UI drift, so `pnpm check:tokens` fails the build
on the common cases (see [enforcement](#enforcement)).

| Need                       | Use                                                                                                                                                                      | Don't                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| A bordered surface         | `Card` (+ `CardHeader`/`CardContent`/`CardFooter`)                                                                                                                       | `rounded-xl border bg-card` on a `div`                                                                                                               |
| Page title / chrome        | `PageLayout` (or `PageContainer` + `PageHeader`)                                                                                                                         | a hand-written `<h1>` or `max-w-* mx-auto`                                                                                                           |
| In-page section heading    | `Section` (`title`, `meta`, `description`, `actions`)                                                                                                                    | a `text-sm font-medium` span + a count span                                                                                                          |
| Empty list / nothing found | `EmptyState`                                                                                                                                                             | an ad-hoc icon + heading + copy stack                                                                                                                |
| Failed load                | `ErrorState` (+ a retry `action`)                                                                                                                                        | ditto, tinted red                                                                                                                                    |
| Loading a whole surface    | `SkeletonTable` / `SkeletonList` / `SkeletonCard` from `@groot/ui` (compose with `Skeleton` for one-off bits); `LoadingState` only for unknown shapes or app-level gates | a per-page custom skeleton component, a bare "Loading…" string, an inline spinner div, or a big centered spinner inside a list whose layout is known |
| Tabular data               | `Table`; `tableColumnHeaderClass` for grid-based tables                                                                                                                  | a raw `<table>`/`<thead>`                                                                                                                            |
| Status / state pill        | `StatusBadge` (token-driven); `Badge` for neutral tags                                                                                                                   | a local status→color map                                                                                                                             |
| Destructive confirmation   | `useConfirm({ destructive: true })`                                                                                                                                      | a bespoke `Dialog` (dismissible by overlay)                                                                                                          |
| Icon sizing                | `size-4` / `size-3.5`                                                                                                                                                    | `h-4 w-4`                                                                                                                                            |
| Icon spacing in a button   | nothing — `Button` already sets `gap`                                                                                                                                    | `mr-2` on the icon                                                                                                                                   |

Colors come only from semantic token classes (`bg-primary`, `text-foreground`,
`text-destructive`, `text-muted-foreground`, `border-border`, …). Raw palette
classes (`gray-*`, `red-*`, …) are allowed _only_ in
`packages/shell/src/index.css`, which defines the tokens.

### Enforcement

`scripts/check-design-tokens.ts` greps every client dir
(`packages/ui/src`, `packages/shell/src`, `packages/jobs/src/client`,
`apps/web/src/client`) for both token and structural drift. It runs:

- on every commit via the `vp staged` pre-commit hook (`vite.config.ts`), and
- in CI via `.github/workflows/check-design-tokens.yml`, which catches
  `--no-verify` commits.

When adding a new client source directory, add it to **both** `SRC_DIRS` in the
script and the workflow's `paths:` filters — a missing filter makes the CI job
silently skip instead of fail.

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
