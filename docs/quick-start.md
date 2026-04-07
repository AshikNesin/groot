# Quick Start Guide

## What You Got

Your boilerplate includes everything needed for a production-ready SaaS:

### Backend

- **JWT Authentication** - Login, logout, protected routes
- **Passkey/WebAuthn** - Passwordless biometric authentication
- **Boom Error Handling** - Standardized HTTP errors
- **Enhanced Logging** - Pino with AsyncLocalStorage context
- **Background Jobs** - pg-boss with dynamic registration
- **Key-Value Store** - Keyv for caching and sessions
- **File Storage** - S3-compatible storage
- **AI Integration** - Unified LLM API with Zod output

### Frontend

- **26 UI Components** - Tables, forms, modals, alerts, etc.
- **Design System** - Stripe-inspired, data-first design
- **Enhanced API Client** - Type-safe, auto 401 handling
- **Layout Components** - PageLayout, PageHeader, etc.

---

## Get Started in 4 Steps

### 1. Setup Environment

#### Option A: Automated Setup (Recommended)

```bash
./setup-boilerplate.sh
```

This will:

- Copy `.env.schema` to `.env`
- Generate secure `JWT_SECRET` (64 characters)
- Generate secure `ADMIN_AUTH_KEY` (48 characters)
- Prompt for your app name and update `RP_NAME`
- Optionally update package.json and code references

#### Option B: Manual Setup

```bash
# Copy environment file
cp .env.schema .env

# Edit .env and set these (IMPORTANT):
# JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
# ADMIN_AUTH_KEY=your-admin-auth-key
# DATABASE_URL=your-database-url
```

> **Security Note**: Always use strong, randomly generated secrets in production!
> Generate with: `openssl rand -base64 48 | tr -d '/+=' | cut -c1-64`

### 2. Install & Generate

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Push database schema
pnpm prisma:push
```

### 3. Install Portless (One-Time)

```bash
# Install portless globally for local HTTPS
npm install -g portless
```

On first run, portless will prompt you to trust a local CA certificate (requires sudo). This enables `https://*.localhost` with no browser warnings. See [Portless & HTTPS Guide](./guides/portless-https.md) for details.

### 4. Start Development

```bash
# Start dev server
pnpm dev

# Server runs on https://groot.localhost
```

---

## Create Your First User

```bash
# Create a user (admin endpoint)
curl -X POST https://groot.localhost/api/v1/auth/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-Auth: your-admin-key" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST https://groot.localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## Create Your First Feature

Features are self-contained modules with routes, controllers, services, and jobs:

### 1. Create the Feature Directory

```bash
mkdir -p server/src/app/myfeature
```

### 2. Define Routes

```typescript
// server/src/app/myfeature/myfeature.routes.ts
import { createRouter } from "@/core/utils/router.utils";
import * as controller from "./myfeature.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import { createSchema } from "./myfeature.validation";

const router = createRouter();

router.get("/", controller.getAll);
router.post("/", validate(createSchema, "body"), controller.create);
router.get("/:id", controller.getById);

export default router;
```

### 3. Create Controller

```typescript
// server/src/app/myfeature/myfeature.controller.ts
import type { Request, Response } from "express";
import * as Service from "./myfeature.service";
import { parseId } from "@/core/utils/controller.utils";

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

### 4. Register Routes

```typescript
// server/src/routes.ts
import myFeatureRoutes from "@/app/myfeature/myfeature.routes";

export function registerRoutes(app: Express): void {
  // ... existing routes
  protectedRouter.use("/myfeature", myFeatureRoutes);
}
```

---

## Use the Auth System

```tsx
// client/src/pages/Login.tsx
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
}
```

---

## Use the Enhanced API Client

```typescript
import { apiClient } from "@/lib/api";

// GET request
const data = await apiClient.get<MyType>("/todos");

// POST request
const newItem = await apiClient.post<MyType>("/todos", { title: "New Todo" });

// PUT request
const updated = await apiClient.put<MyType>("/todos/1", { completed: true });

// DELETE request
await apiClient.delete("/todos/1");
```

---

## Available Components

### Layout

- `PageLayout` - Complete page wrapper
- `PageHeader` - Page title & actions
- `PageContainer` - Max-width container
- `Section` - Content sections

### UI Components

- `Button` - 6 variants
- `Badge` - 7 variants
- `Card` - Card layouts
- `Table` - Data tables
- `Form` - React Hook Form integration
- `Input`, `Textarea`, `Select` - Form inputs
- `Checkbox`, `Switch` - Toggles
- `Dialog`, `Sheet` - Modals & drawers
- `Tabs` - Tab navigation
- `Alert` - Status messages
- `Breadcrumb` - Navigation
- `Pagination` - Page navigation
- `Progress` - Progress bars
- `Popover`, `Dropdown Menu` - Menus
- `Separator` - Visual dividers
- `LoadingSpinner`, `LoadingSkeleton` - Loading states
- `EmptyState`, `ErrorState` - Empty & error states

---

## Common Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm dev:docker       # Start with Docker PostgreSQL

# Database
pnpm prisma generate  # Generate Prisma client
pnpm prisma:push      # Push schema to database

# Build
pnpm build            # Build for production
pnpm start            # Run production build

# Code Quality
pnpm lint             # Lint code
pnpm format           # Format code
pnpm check            # Lint and format check

# Testing
pnpm test             # Run tests
pnpm test:watch       # Watch mode
pnpm test:e2e         # E2E tests
```

---

## Production Checklist

Before deploying to production:

- [ ] Run `./setup-boilerplate.sh` to generate secure secrets
- [ ] Change `JWT_SECRET` to a strong random value (min 32 chars)
- [ ] Change `ADMIN_AUTH_KEY` to a strong random value
- [ ] Set `DATABASE_URL` to your production database
- [ ] Set `SENTRY_DSN` for error tracking (optional)
- [ ] Configure passkey environment (`RP_ID`, `RP_NAME`, `RP_ORIGIN`)
- [ ] Set `NODE_ENV=production`
- [ ] Run `pnpm build` to verify build succeeds
- [ ] Run `pnpm test` to verify tests pass

---

**Ready to ship!**

Your boilerplate is production-ready with:

- JWT and Passkey authentication
- 26 UI components
- Background jobs system
- Error handling & logging
- Type-safe API client
- AI integration
- File storage
