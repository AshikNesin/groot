# Testing Guide

Vitest powers the unit/integration tests while Supertest handles HTTP assertions.

## Commands

```bash
pnpm test         # Single run, great for CI
pnpm test:watch   # Watch mode during development
```

## Server Testing Patterns

- **Route tests** – See `server/src/routes/job.routes.test.ts` for an example. It mounts an Express app, mocks `@/core/job`, and exercises the router with Supertest.
- **Controller/service tests** – Instantiate the controller/service directly and stub Prisma via vi mocks when needed. Throw `NotFoundError` or other domain errors to validate middleware behavior.
- **Job handlers** – Import the handler and pass a fake `pg-boss` job object. You can assert Prisma calls (`vi.spyOn(prisma.todo, ...)`) without spinning up the queue.

## Mocking Tips

- Use `vi.hoisted` to build mocks shared across tests.
- When mocking Prisma, target the specific model methods (e.g., `vi.spyOn(prisma.todo, "deleteMany")`).
- For PgBoss helpers, mock `@/core/job` exports similar to the job route test.

## HTTP Coverage Checklist

For each API route, cover:

1. **Success path** – Validate `201/200` responses and response body structure (matches `ResponseHandler`).
2. **Validation errors** – Send malformed payloads to ensure `validate()` rejects them.
3. **Auth guard** – Optionally assert that missing `Authorization` headers yield `401` (via middleware tests or integration harnesses).
4. **Edge cases** – e.g., `JobName` lookups, missing resources, pagination limits.

## Background Job Coverage

- Simulate PgBoss jobs by passing `{ id: "demo", data: {...} }` into handlers.
- Assert log output via `vi.spyOn(logger, "info")` if you need to ensure telemetry fires.
- For database mutations (cleanup job) wrap Prisma calls inside transactions during tests or mock them out entirely.

## Client Testing (Future Work)

The current repo focuses on server-side Vitest tests. If you add React component tests:

- Use Vitest + `@testing-library/react`.
- Mock `react-query` providers and the Axios client.
- Assert routing via `MemoryRouter`.

## Continuous Verification

- Run `pnpm lint` + `pnpm test` before opening PRs.
- Add GitHub Actions or other CI once the project matures to enforce these checks automatically.
