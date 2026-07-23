# Quick start

Get the app running, create your first user, and scaffold your first feature.

## What's in the box

| Area  | Capabilities                                                          |
| ----- | --------------------------------------------------------------------- |
| Auth  | JWT login + protected routes, Passkey/WebAuthn, admin user management |
| API   | Feature-module pattern (`routes` + `service` + `schema`), Boom errors |
| Jobs  | Background queue (pg-boss / honker) with dynamic handler registration |
| Data  | Prisma (SQLite default / Postgres), Keyv key-value store              |
| Files | S3 storage (uploads, downloads, folders, renames)                     |
| AI    | Unified LLM API with Zod structured output                            |
| Infra | Pino logging, Sentry error tracking, rate limiting                    |
| UI    | Radix + Tailwind component library, layout primitives, API client     |

## 1. Set up the environment

### Automated (recommended)

```bash
pnpm groot:setup
```

This installs the global CLIs (varlock, portless), sets up git hooks
(lint-staged + gitleaks), prompts for your app name and propagates it to
`config.yml`, `package.json`, and `.env.schema`, then installs deps and
generates the Prisma client.

> Secrets are managed by **varlock + Doppler** — set `DOPPLER_TOKEN`, or
> configure secrets on your hosting platform. In development, varlock provides
> working defaults from `.env.schema`.

### Manual

```bash
cp .env.schema .env
pnpm install
pnpm prisma generate
pnpm db:migrate
```

> **Production secrets:** always use strong, random values.
> `openssl rand -base64 48 | tr -d '/+=' | cut -c1-64`

## 2. Install portless (one-time)

```bash
npm install -g portless
```

On the first `pnpm dev`, portless prompts you to trust a local CA certificate
(requires sudo), enabling `https://*.localhost` with no browser warnings.
See [Portless & HTTPS](./guides/portless-https.md).

## 3. Start developing

```bash
pnpm dev
# → https://groot.localhost
```

## Create your first user

```bash
# Admin-only (uses X-Admin-Auth-Key)
curl -X POST https://groot.localhost/api/v1/auth/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-Auth-Key: your-admin-key" \
  -d '{"email":"test@example.com","password":"demo@example.com"}'

# Log in → returns { token, user }
curl -X POST https://groot.localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"demo@example.com"}'
```

## Create your first feature

A feature is a self-contained module: `routes` + `service` + `schema`
(+ optional `jobs`).

### 1. Scaffold the module

```bash
mkdir -p apps/web/src/server/api/myfeature
```

### 2. Define routes

```ts
// apps/web/src/server/api/myfeature/myfeature.routes.ts
import type { Request, Response } from "express";
import { createRouter } from "@groot/core/utils/router.utils";
import { parseId, parseBody } from "@groot/core/utils/controller.utils";
import * as service from "./myfeature.service";
import { createSchema } from "./myfeature.schema";

const router = createRouter();

router.get("/", async () => service.findAll());

router.post("/", async (req: Request, res: Response) => {
  const payload = parseBody(req, createSchema);
  res.status(201);
  return service.create({ data: payload });
});

router.get("/:id", async (req: Request) => {
  const id = parseId(req.params.id);
  return service.findById({ id });
});

export default router;
```

### 3. Register the routes

```ts
// apps/web/src/server/routes.ts
import myFeatureRoutes from "./api/myfeature/myfeature.routes";

export function registerRoutes(app: Express): void {
  // ...
  protectedRouter.use("/myfeature", myFeatureRoutes);
}
```

See [Development workflow](./guides/development.md) for the service and schema
files, and [Architecture](./guides/architecture.md) for the full pattern.

## Use the API client

```ts
import { apiClient } from "@groot/shell/lib/api";

const data = await apiClient.get<MyType>("/todos");
const created = await apiClient.post<MyType>("/todos", { title: "New" });
const updated = await apiClient.put<MyType>("/todos/1", { completed: true });
await apiClient.delete("/todos/1");
```

`apiClient` is a shared Axios instance that injects the JWT and handles `401`
(logout). See [Client](./features/client.md).

## Common commands

| Task             | Command                |
| ---------------- | ---------------------- |
| Dev server       | `pnpm dev`             |
| Apply migrations | `pnpm db:migrate`      |
| Generate Prisma  | `pnpm prisma generate` |
| Build            | `pnpm build`           |
| Run prod build   | `pnpm start`           |
| Lint + format    | `pnpm check`           |
| Unit tests       | `pnpm test`            |
| Tests (both DBs) | `pnpm test:all`        |
| E2E tests        | `pnpm test:e2e`        |

## Production checklist

Before deploying:

- [ ] Run `pnpm groot:setup` to configure your app
- [ ] Set `DOPPLER_TOKEN` (or configure secrets on your hosting platform)
- [ ] Set `DATABASE_ENGINE` (`sqlite`/`postgres`) and `DATABASE_URL` to your production database
- [ ] Set `JWT_SECRET_KEY` and `ADMIN_AUTH_KEY` (strong random values)
- [ ] Configure passkey settings in `config.yml` (`passkey.rpId`, `passkey.rpName`, `passkey.origin`)
- [ ] Set `SENTRY_DSN` for error tracking (optional)
- [ ] Set `NODE_ENV=production`
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes

→ Next: [Architecture](./guides/architecture.md) and [API request recipes](./examples/api-requests.md).
