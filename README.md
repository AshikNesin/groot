# Groot

A production-ready SaaS boilerplate with Express.js, React, TypeScript, and a complete UI component library.

## ✨ Features

### Backend

- ✅ **JWT Authentication** - Complete auth system with login, logout, and protected routes
- ✅ **Production Error Handling** - Sentry integration, breadcrumbs, and request tracing
- ✅ **Enhanced Logging** - Request correlation, performance tracking, and business events
- ✅ **Base Controller** - Pagination, sorting, ID parsing utilities
- ✅ **Background Jobs** - pg-boss queue system for async processing
- ✅ **Key-Value Storage** - Keyv with PostgreSQL adapter
- ✅ **File Storage** - S3-backed storage with public sharing

### Frontend

- ✅ **26 UI Components** - Complete component library with Radix UI
- ✅ **Design System** - Stripe-inspired, data-first design tokens
- ✅ **Type-Safe API Client** - Automatic 401 handling and error management
- ✅ **Layout Components** - PageLayout, PageHeader, PageContainer, Section
- ✅ **Auth Store** - JWT authentication with loading and error states
- ✅ **30+ Utility Functions** - Date, currency, validation, and more

## 📚 Documentation

- **[Quick Start Guide](./docs/quick-start.md)** - Get up and running in 3 steps
- **[Complete Reference](./docs/boilerplate-enhancements.md)** - Full documentation of all features
- **[Documentation Hub](./docs/README.md)** - Browse all available guides

## Prerequisites

- Node.js (v18 or later recommended)
- PostgreSQL database
- pnpm (Install globally: `npm install -g pnpm`)
- portless (Install globally: `npm install -g portless`)

## Quick Start

### Option 1: Automated Setup (Recommended)

Run the setup script to automatically configure your environment with secure secrets:

```bash
./setup-boilerplate.sh
```

This script will:

- Copy `.env.schema` to `.env`
- Generate secure `JWT_SECRET` and `ADMIN_AUTH_KEY`
- Prompt for your app name and update `RP_NAME`
- Optionally update package.json and code references

After running the script:

```bash
pnpm install
pnpm prisma generate
pnpm prisma db push
pnpm dev
```

### Option 2: Manual Setup

1. **Setup environment:**

   ```bash
   cp .env.schema .env
   # Edit .env and set JWT_SECRET, ADMIN_AUTH_KEY, DATABASE_URL
   ```

2. **Install and generate:**

   ```bash
   pnpm install
   pnpm prisma generate
   pnpm prisma db push
   ```

3. **Start development:**
   ```bash
   pnpm dev
   # Server runs on http://<appname>.localhost:1355 (via portless)
   ```

See [Quick Start Guide](./docs/quick-start.md) for detailed instructions.

## Available Scripts

- **`pnpm build`**: Compiles TypeScript code to JavaScript in the `dist` directory.
- **`pnpm start`**: Starts the application from the compiled code in `dist`.
- **`pnpm dev`**: Starts the application in development mode using `tsx`. It watches for changes in `src/index.ts` and automatically restarts the server.
- **`pnpm lint`**: Lints the TypeScript code in the `src` directory using Vite+ (Oxlint).
- **`pnpm format`**: Formats the TypeScript code in the `src` directory using Vite+ (Oxfmt).

## Project Structure

```
├── server/
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes
│   │   ├── middlewares/    # Express middlewares
│   │   ├── core/           # Core utilities (errors, logger, jobs)
│   │   ├── models/         # Data models
│   │   ├── validations/    # Zod schemas
│   │   └── utils/          # Helper functions
│   └── ...
├── client/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ui/         # 26 UI components
│   │   │   └── layout/     # Layout components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utils & API client
│   │   ├── store/          # Zustand stores
│   │   └── hooks/          # Custom hooks
│   └── ...
├── docs/               # Documentation
├── prisma/             # Database schema
└── ...
```

## Tech Stack

| Area                | Technologies                                                     |
| ------------------- | ---------------------------------------------------------------- |
| **Backend**         | Node.js, Express 5, TypeScript, Prisma, PostgreSQL               |
| **Auth**            | JWT (bcryptjs), Passkeys (@simplewebauthn/server), cookie-parser |
| **File Storage**    | AWS S3 SDK (@aws-sdk/client-s3), Multer                          |
| **Jobs**            | pg-boss (PostgreSQL-backed queue)                                |
| **Key-Value Store** | Keyv with PostgreSQL adapter                                     |
| **Logging**         | Pino, Sentry                                                     |
| **Frontend**        | React 19, TypeScript, Vite 7                                     |
| **UI**              | Radix UI primitives, Tailwind CSS, shadcn/ui patterns            |
| **State**           | Zustand, React Query                                             |
| **Routing**         | React Router 7                                                   |
| **Tooling**         | Vite+ (Oxlint, Oxfmt), Vitest, Playwright, pnpm                  |

## Authentication

### Create First User

```bash
curl -X POST http://localhost:3000/api/v1/auth/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-Auth: your-admin-key" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

See [Quick Start Guide](./docs/quick-start.md) for more examples.

## Common Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Run production build

# Database
pnpm prisma generate  # Generate Prisma client
pnpm prisma db push   # Push schema to database

# Code Quality
pnpm lint             # Lint code
pnpm format           # Format code
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
```

## What's Included

### Backend (35+ files)

- Complete JWT authentication system
- Enhanced error handling with Sentry
- Request logging with breadcrumbs and tracing
- Base controller with utilities
- 30+ utility functions (date, validation, array)
- Async handler wrapper
- Admin auth middleware

### Frontend (30+ files)

- 26 production-ready UI components
- Design system with 275 lines of tokens
- Type-safe API client (207 lines)
- Enhanced auth store with JWT support
- Layout components (PageLayout, PageHeader, etc.)
- 25+ date utility functions
- Loading states (spinner, skeleton, empty state)

### Total Stats

- **60+ files added/modified**
- **8,000+ lines of code**
- **26 UI components**
- **Build size**: 438 kB frontend, 373 kB backend

## Documentation

- **[Quick Start Guide](./docs/quick-start.md)** - Setup and first steps
- **[Boilerplate Enhancements](./docs/boilerplate-enhancements.md)** - Complete feature reference
- **[Setup Guide](./docs/SETUP_GUIDE.md)** - Detailed setup instructions
- **[Documentation Hub](./docs/README.md)** - All available guides

## Production Checklist

Before deploying:

- [ ] Run `./setup-boilerplate.sh` to generate secure secrets (or manually set):
  - [ ] Strong `JWT_SECRET` (min 32 characters)
  - [ ] Strong `ADMIN_AUTH_KEY`
- [ ] Configure production `DATABASE_URL`
- [ ] Set `SENTRY_DSN` for error tracking (optional)
- [ ] Update `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD`
- [ ] Set `NODE_ENV=production`
- [ ] Test auth endpoints
- [ ] Run `pnpm build` to verify
- [ ] Run `pnpm test` to verify tests pass

## License

MIT
