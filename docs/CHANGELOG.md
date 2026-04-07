# Docs Changelog

## 2026-04-07

- Updated all documentation to reflect new domain-driven architecture:
  - Replaced references to old folder structure (`controllers/`, `services/`, `models/`, `routes/`, `validations/`)
  - Documented new `app/` and `shared/` feature module organization
  - Updated patterns to use `createRouter()` utility and functional controllers
  - Changed auth references from `basicAuthMiddleware` to `jwtAuthMiddleware`
  - Updated error handling to use `Boom` factory methods
- Updated `CLAUDE.md`:
  - New directory structure with `app/` and `shared/` feature modules
  - Route registration via `routes.ts`
  - Controller pattern (simple functions returning values)
  - Dynamic job registration pattern
- Updated `docs/guides/architecture.md`:
  - Feature module structure and organization
  - Request flow with `createRouter` and `handle` middleware
  - Core module overview (ai, errors, job, kv, logger, storage)
- Updated `docs/guides/development.md`:
  - New feature creation workflow
  - Modern code patterns
- Updated `docs/guides/testing.md`:
  - Updated test structure and patterns
  - Modern mocking examples
- Updated `docs/README.md`:
  - New architecture overview
  - Updated tech stack and module list
- Updated `docs/quick-start.md`:
  - New API endpoint patterns
  - Updated examples
- Updated `docs/features/todos.md`:
  - Feature module structure
  - Modern controller/service patterns
- Updated `docs/features/storage.md`:
  - Module organization
  - Updated auth patterns
- Updated `docs/features/jobs.md`:
  - Modularized job system
  - Dynamic handler registration
- Updated `docs/boilerplate-enhancements.md`:
  - Complete rewrite reflecting current architecture
  - Domain-driven structure
  - Core infrastructure modules

## 2026-03-14

- Migrated to Vite+ unified toolchain:
  - Replaced Biome with Vite+ (Oxlint + Oxfmt) for linting and formatting
  - Updated all `vite` imports to `vite-plus`
  - Updated all `vitest` imports to `vite-plus/test`
  - Consolidated config into `vite.config.ts` with `lint`, `fmt`, `staged` blocks
  - Created `vitest.config.server.ts` for server tests with proper alias resolution
  - Fixed `manualChunks` to use function format (Vite 8/Rolldown requirement)
  - Updated `server/src/index.ts` dynamic import from `vite` to `vite-plus`
- Migrated pre-commit hooks to Vite+:
  - Removed `.pre-commit-config.yaml` (no longer need pre-commit CLI)
  - Updated `.vite-hooks/pre-commit` to run Gitleaks + `vp staged`
  - Updated `docs/precommit-hooks.md` documentation
- Cleaned up duplicate test files in `client/src/` and `server/src/`
- Updated `baseline-browser-mapping` to latest version
- Updated `CLAUDE.md` with new tooling documentation

## 2025-11-15

- Seeded documentation hub mirroring Nesin's Finance API style:
  - Added setup guide, architecture overview, development workflow, and testing guide
  - Documented todos API, background jobs, and client patterns
  - Published API request examples and changelog for future updates
