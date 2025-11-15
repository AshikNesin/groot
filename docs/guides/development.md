# Development Workflow

## Core Commands

```bash
pnpm dev        # Express + Vite dev servers (hot reload)
pnpm lint       # Biome lint across server and client
pnpm format     # Biome format for server/src and client/src
pnpm test       # Vitest run (server + shared code)
pnpm build      # Vite client + server bundling via scripts/build.mjs
pnpm start      # Runs dist/bundle.js with NODE_ENV=production
```

Prisma helpers:

```bash
pnpm prisma:generate   # Explicit regeneration (also runs on postinstall)
pnpm prisma:push       # Apply schema changes to the connected database
```

## Coding Conventions

- **TypeScript everywhere** – set `"type": "module"` and path aliases defined in `tsconfig.json` / `client/tsconfig.json`.
- **Validation first** – attach `validate(zodSchema)` middleware to new routes and re-use DTOs in controllers.
- **Response format** – rely on `ResponseHandler.success/error/paginated` for consistent envelopes.
- **Logging** – use `logger` from `core/logger` for structured events; avoid `console.log`.
- **Minimal comments** – favor clear code, per repository guidelines.
- **Auth guard** – all `/api/v1` endpoints should mount beneath `basicAuthMiddleware` unless explicitly public.

## Adding a New API Domain

1. **Validation** – Create schemas in `server/src/validations`.
2. **Model** – Extend Prisma schema and generate types; add model methods under `server/src/models`.
3. **Service** – Encapsulate domain logic in `server/src/services`.
4. **Controller** – Map HTTP verbs to service calls in `server/src/controllers`.
5. **Routes** – Register endpoints inside a new router under `server/src/routes`, then mount it in `routes/index.ts`.
6. **Tests** – Add Vitest + Supertest coverage under `server/src/routes/*.test.ts` or domain-specific folders.

## Extending the Job System

1. Add an entry to `JobName` and its payload type in `core/job/queue.ts`.
2. Author a handler in `server/src/jobs/<job>.ts` that imports `registerJobHandler(JobName.X, handler)`.
3. Ensure the file is imported in `server/src/jobs/index.ts` so `startWorkers()` picks it up.
4. Optionally customize retries/timeouts in `core/job/config.ts` by updating `jobOptions`.
5. Expose any required HTTP triggers via `job.routes.ts` or domain-specific controllers.

## Client Development Tips

- Use React Router routes defined in `App.tsx`; wrap protected UIs with `ProtectedRoute`.
- Fetch data through typed hooks in `hooks/api` so React Query caching and error handling stay centralized.
- Store cross-session auth tokens via `useAuthStore` to ensure Axios automatically injects Basic Auth headers.
- Tailwind styles live beside components; prefer utility classes over bespoke CSS when possible.

## Iteration Loop

1. Run `pnpm dev`.
2. Update API or client code.
3. Watch Vitest or run `pnpm test` for targeted coverage.
4. Lint/format before committing to keep CI clean.
5. Update docs (this directory) if behavior or workflows change.
