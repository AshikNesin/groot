---
title: Refactor Frontend into Core/App/UI Layers
type: refactor
status: active
date: 2026-04-14
---

# Refactor Frontend into Core/App/UI Layers

Reorganize `client/src/` into three clear layers — `ui/`, `core/`, `app/` — so that boilerplate infrastructure can be cleanly synced to downstream repos via git merge/rebase, while business-specific features remain isolated and easy to swap.

## Overview

The backend already follows a `core/` → `shared/` → `app/` separation that makes it easy to merge boilerplate updates into downstream projects. The frontend currently mixes infrastructure (auth, API client, layouts) with business features (todos, storage, jobs) in flat directories (`pages/`, `hooks/`, `store/`). This plan adapts the backend's separation philosophy to the frontend's unique needs — adding a dedicated `ui/` layer for the design system.

**Before:**

```
client/src/
├── components/       ← ui/ + layout/ + feature components mixed
├── pages/            ← all pages flat, no feature grouping
├── hooks/api/        ← all data hooks flat, no feature grouping
├── store/            ← auth + ai mixed
├── services/         ← passkey + settings mixed
├── lib/              ← api client + utils + design tokens mixed
└── types/            ← job types + ai types mixed
```

**After:**

```
client/src/
├── ui/               ← Design system (pure shadcn primitives)
├── core/             ← Boilerplate infrastructure (synced)
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── store/
│   └── types/
├── app/              ← Business features (per-project)
│   ├── ai/
│   ├── jobs/
│   ├── storage/
│   └── todo/
├── App.tsx
├── main.tsx
└── index.css
```

## Problem Statement / Motivation

1. **Merge conflicts on sync** — When downstream repos customize pages or hooks, git merges from the boilerplate conflict because infrastructure and business code share the same directories.
2. **Unclear boundaries** — A developer can't tell at a glance which files are "boilerplate infrastructure" vs "project-specific features." Imports cross boundaries freely.
3. **Inconsistent patterns** — Types live in `@/types/` for jobs/ai but inline in hook files for todos/storage. Some hooks use raw `api` (axios), others use `apiClient`. Some pages use `PageLayout`, others build inline layouts.
4. **Design system is buried** — The 24 shadcn components are nested under `components/ui/` alongside feature components, making them harder to find and update independently.

## Proposed Solution

Three layers with clear ownership:

| Layer   | Purpose                    | Synced? | Contains                                                                |
| ------- | -------------------------- | ------- | ----------------------------------------------------------------------- |
| `ui/`   | Design system              | Yes     | Pure shadcn/ui primitives. Zero business logic. Zero app imports.       |
| `core/` | Boilerplate infrastructure | Yes     | API client, auth, layouts, services, stores, utilities, platform types. |
| `app/`  | Business features          | No      | Feature modules with pages, hooks, components, types.                   |

### Why three layers (not four)?

The backend uses `core/`, `shared/`, `app/` but the frontend doesn't need the `shared/` distinction. On the backend, `shared/` features (auth, storage, AI, jobs) have their own API routes and database models — they're full-stack features. On the frontend, the same things are _consumers_ of those APIs, not providers. Auth hooks, AI client, job types — these are infrastructure that every downstream app uses. They belong in `core/`.

### Why `app/` uses feature modules (not flat directories)?

Flat directories (`pages/`, `hooks/`) work for small apps but create two problems at scale:

1. **Merge conflicts** — A downstream repo modifying `hooks/api/useTodos.ts` conflicts with the boilerplate adding `hooks/api/useInvoices.ts`.
2. **Scattered related code** — A todo's page, hook, and types live in three different directories. Feature modules keep everything together.

## Target Directory Structure

```
client/src/
├── ui/                              # Design system (24 files)
│   ├── alert.tsx
│   ├── badge.tsx
│   ├── breadcrumb.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── checkbox.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── empty-state.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── loading-skeleton.tsx
│   ├── loading-spinner.tsx
│   ├── pagination.tsx
│   ├── popover.tsx
│   ├── progress.tsx
│   ├── select.tsx
│   ├── separator.tsx
│   ├── sheet.tsx
│   ├── status-badge.tsx
│   ├── switch.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── textarea.tsx
│   ├── toast.tsx
│   └── toaster.tsx
│
├── core/                            # Boilerplate infrastructure
│   ├── components/                  # App shell & infra components
│   │   ├── layout/                  # Page layout primitives
│   │   │   ├── index.ts
│   │   │   ├── PageContainer.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── PageLayout.tsx
│   │   │   └── Section.tsx
│   │   ├── AppSettings.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── Layout.tsx
│   │   ├── PasskeyManager.tsx
│   │   └── ProtectedRoute.tsx
│   ├── hooks/                       # Infrastructure hooks
│   │   └── use-toast.ts
│   ├── lib/                         # Core utilities
│   │   ├── api.ts                   # API client (ApiClient class + axios instance)
│   │   ├── ai-client.ts             # AI streaming client
│   │   ├── date.utils.ts            # Date formatting utilities
│   │   ├── design-tokens.ts         # Design system constants
│   │   └── utils.ts                 # cn(), formatCurrency(), etc.
│   ├── services/                    # Core services
│   │   ├── passkey.ts               # WebAuthn passkey service
│   │   └── settings.ts              # App settings service
│   ├── store/                       # Core stores
│   │   ├── auth.ts                  # Auth state (login, logout, checkAuth)
│   │   └── ai.ts                    # AI conversation state
│   └── types/                       # Platform types
│       ├── ai.ts                    # ChatRequest, ModelInfo, StreamEvent, etc.
│       └── jobs.ts                  # Job, JobState, JobStats, etc.
│
├── app/                             # Business feature modules
│   ├── ai/                          # AI chat feature
│   │   ├── pages/
│   │   │   └── Dashboard.tsx
│   │   ├── hooks/
│   │   │   └── useAI.ts
│   │   └── types/
│   │       └── (types from core/types/ai.ts if business-specific)
│   ├── jobs/                        # Job management feature
│   │   ├── pages/
│   │   │   ├── Jobs.tsx
│   │   │   └── JobDetail.tsx
│   │   └── hooks/
│   │       └── useJobs.ts           # Extract from inline apiClient calls in pages
│   ├── storage/                     # File storage feature
│   │   ├── pages/
│   │   │   └── Storage.tsx
│   │   ├── hooks/
│   │   │   └── useStorage.ts
│   │   └── types/
│   │       └── storage.ts           # StorageFile, PublicShare types
│   ├── todo/                        # Todo CRUD feature
│   │   ├── pages/
│   │   │   └── Todos.tsx
│   │   ├── hooks/
│   │   │   └── useTodos.ts
│   │   └── types/
│   │       └── todo.ts              # Todo, CreateTodoDTO, UpdateTodoDTO types
│   ├── settings/                    # Settings page feature
│   │   └── pages/
│   │       └── Settings.tsx
│   └── auth/                        # Auth pages
│       └── pages/
│           └── Login.tsx
│
├── App.tsx                          # Route definitions (references both core and app)
├── main.tsx                         # Entry point
└── index.css                        # Global styles / Tailwind
```

## Acceptance Criteria

- [x] All 24 shadcn/ui components moved to `ui/`
- [x] All boilerplate infrastructure moved to `core/` (components, hooks, lib, services, store, types)
- [x] All business features organized in `app/` feature modules
- [x] All imports updated to new paths (`@/ui/button`, `@/core/lib/api`, `@/app/todo/hooks/useTodos`, etc.)
- [x] `App.tsx` route definitions updated to import from `@/app/*/pages/`
- [x] Path aliases work correctly in both Vite and TypeScript
- [x] `pnpm build` succeeds with no errors
- [x] `pnpm check` (lint + format) passes
- [x] `pnpm test` passes (tests updated for new import paths)
- [ ] E2E tests pass (`pnpm test:e2e`)
- [ ] No functional changes — this is a pure reorganization

## Technical Considerations

### Import Path Changes

Every file in the project needs import updates. The mapping:

| Old Import                       | New Import                            |
| -------------------------------- | ------------------------------------- |
| `@/components/ui/button`         | `@/ui/button`                         |
| `@/components/layout/PageLayout` | `@/core/components/layout/PageLayout` |
| `@/components/Layout`            | `@/core/components/Layout`            |
| `@/components/ProtectedRoute`    | `@/core/components/ProtectedRoute`    |
| `@/components/CommandPalette`    | `@/core/components/CommandPalette`    |
| `@/components/AppSettings`       | `@/core/components/AppSettings`       |
| `@/components/PasskeyManager`    | `@/core/components/PasskeyManager`    |
| `@/lib/api`                      | `@/core/lib/api`                      |
| `@/lib/ai-client`                | `@/core/lib/ai-client`                |
| `@/lib/utils`                    | `@/core/lib/utils`                    |
| `@/lib/date.utils`               | `@/core/lib/date.utils`               |
| `@/lib/design-tokens`            | `@/core/lib/design-tokens`            |
| `@/hooks/use-toast`              | `@/core/hooks/use-toast`              |
| `@/hooks/api/useTodos`           | `@/app/todo/hooks/useTodos`           |
| `@/hooks/api/useStorage`         | `@/app/storage/hooks/useStorage`      |
| `@/hooks/api/useAI`              | `@/app/ai/hooks/useAI`                |
| `@/store/auth`                   | `@/core/store/auth`                   |
| `@/store/ai`                     | `@/core/store/ai`                     |
| `@/services/passkey`             | `@/core/services/passkey`             |
| `@/services/settings`            | `@/core/services/settings`            |
| `@/types` (job types)            | `@/core/types/jobs`                   |
| `@/types/ai`                     | `@/core/types/ai`                     |
| `@/pages/Dashboard`              | `@/app/ai/pages/Dashboard`            |
| `@/pages/Todos`                  | `@/app/todo/pages/Todos`              |
| `@/pages/Storage`                | `@/app/storage/pages/Storage`         |
| `@/pages/Jobs`                   | `@/app/jobs/pages/Jobs`               |
| `@/pages/JobDetail`              | `@/app/jobs/pages/JobDetail`          |
| `@/pages/Settings`               | `@/app/settings/pages/Settings`       |
| `@/pages/Login`                  | `@/app/auth/pages/Login`              |

### Type Extraction

Currently, some types are co-located in hook files. Move them to dedicated type files within feature modules:

| Type                                     | Current Location          | New Location                   |
| ---------------------------------------- | ------------------------- | ------------------------------ |
| `Todo`, `CreateTodoDTO`, `UpdateTodoDTO` | `hooks/api/useTodos.ts`   | `app/todo/types/todo.ts`       |
| `StorageFile`, `PublicShare`             | `hooks/api/useStorage.ts` | `app/storage/types/storage.ts` |
| Job types (`Job`, `JobState`, etc.)      | `types/index.ts`          | `core/types/jobs.ts`           |
| AI types                                 | `types/ai.ts`             | `core/types/ai.ts`             |

### Test Updates

Test files in `tests/client/` need import path updates to match the new structure. Test setup (`client/src/test/setup.ts`) stays in place.

### Path Aliases

No changes needed to `@/` alias — it already resolves to `client/src/`. The new structure works naturally:

- `@/ui/button` → `client/src/ui/button.tsx`
- `@/core/lib/api` → `client/src/core/lib/api.ts`
- `@/app/todo/hooks/useTodos` → `client/src/app/todo/hooks/useTodos.ts`

## System-Wide Impact

- **Import graph**: Every file that imports from `@/components/ui/*`, `@/lib/*`, `@/store/*`, `@/services/*`, `@/hooks/*`, `@/types/*`, or `@/pages/*` needs path updates.
- **Build system**: Vite config (`vite.config.ts`) needs no changes — the `@/` alias already points to `client/src/`.
- **TypeScript config**: `client/tsconfig.json` needs no changes — `@/*` already maps to `./*`.
- **Tests**: All test files referencing old paths need updates.
- **Git history**: Using `git mv` for file moves preserves history.

## MVP

### Implementation Phases

#### Phase 1: Create directories and move files

1. Create `client/src/ui/`, `client/src/core/`, `client/src/app/` directory structures
2. Move all 24 `components/ui/*.tsx` files to `ui/` using `git mv`
3. Move layout components to `core/components/layout/`
4. Move core components (Layout, ProtectedRoute, etc.) to `core/components/`
5. Move `lib/*` to `core/lib/`
6. Move `store/*` to `core/store/`
7. Move `services/*` to `core/services/`
8. Move `hooks/use-toast.ts` to `core/hooks/`
9. Move `types/*` to `core/types/`

#### Phase 2: Create app feature modules

1. Create `app/todo/` with `pages/`, `hooks/`, `types/`
2. Create `app/ai/` with `pages/`, `hooks/`
3. Create `app/jobs/` with `pages/`, `hooks/`
4. Create `app/storage/` with `pages/`, `hooks/`, `types/`
5. Create `app/settings/` with `pages/`
6. Create `app/auth/` with `pages/`
7. Extract co-located types into dedicated type files

#### Phase 3: Update all imports

1. Update all `@/components/ui/*` → `@/ui/*`
2. Update all `@/components/layout/*` → `@/core/components/layout/*`
3. Update all `@/components/{Layout,ProtectedRoute,...}` → `@/core/components/{...}`
4. Update all `@/lib/*` → `@/core/lib/*`
5. Update all `@/store/*` → `@/core/store/*`
6. Update all `@/services/*` → `@/core/services/*`
7. Update all `@/hooks/use-toast` → `@/core/hooks/use-toast`
8. Update all `@/hooks/api/useTodos` → `@/app/todo/hooks/useTodos`
9. Update all `@/hooks/api/useStorage` → `@/app/storage/hooks/useStorage`
10. Update all `@/hooks/api/useAI` → `@/app/ai/hooks/useAI`
11. Update all `@/types` → `@/core/types/jobs`
12. Update all `@/types/ai` → `@/core/types/ai`
13. Update all `@/pages/*` → `@/app/*/pages/*`
14. Update `App.tsx` route imports

#### Phase 4: Update tests and verify

1. Update all test file imports
2. Run `pnpm build` — must pass
3. Run `pnpm check` — must pass
4. Run `pnpm test` — must pass
5. Run `pnpm test:e2e` — must pass
6. Manual smoke test in browser

## Sources & References

- Backend pattern: `server/src/core/`, `server/src/shared/`, `server/src/app/`
- Route registration: `server/src/routes.ts`
- Current frontend structure: `client/src/`
- Path alias config: `client/tsconfig.json`, `vite.config.ts`
- Existing plan: `docs/plans/2026-02-27-feat-testing-and-code-organization-plan.md`
