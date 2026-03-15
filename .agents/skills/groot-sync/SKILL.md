---
name: groot-sync
description: Sync reusable core components and infrastructure from the groot boilerplate repo. Includes UI components, server core utilities, middlewares, shared hooks, docs, and infrastructure. Use when syncing from groot, pulling boilerplate updates, or keeping apps aligned with the source of truth. Triggers on "groot sync", "sync from groot", "pull boilerplate changes", "update from boilerplate".
metadata:
  tags: sync, boilerplate, groot, infrastructure, components, utilities
---

## Smart Sync Rules

**CRITICAL PRESERVATION RULES:**

- Never override project-specific business logic, services, controllers, or pages
- Sync reusable core components (UI, utilities, middlewares, core modules)
- If the project has REMOVED or MODIFIED boilerplate defaults, do NOT re-add them
- Check git history to distinguish intentional removals vs pending updates
- When in doubt, ask before overriding

## When to use

Use this skill when you need to sync infrastructure files from the groot boilerplate repository to this project. Triggers on:

- "sync from groot"
- "pull boilerplate changes"
- "check for groot updates"
- "update infrastructure files"
- "/groot-sync"

## Quick Check

First, check what changes are available:

```bash
./.groot/sync.sh
```

This shows:

- New commits since last sync
- Files that will be synced
- Files that will be skipped
- Latest boilerplate commit hash

## Full Sync Workflow

### 1. Read the sync config

Read `.groot/boilerplate-sync.json` to understand:

- Last synced commit (`last_sync.commit`)
- Exclude patterns (`sync_config.exclude_patterns`) - hard "never sync" rules
- Merge strategies (`sync_config.merge_strategy`)

### 2. Fetch latest from remote

```bash
# Clone or fetch the boilerplate repo to a temp directory
BOILERPLATE_REPO="https://github.com/AshikNesin/groot"
TEMP_DIR=$(mktemp -d)

git clone --depth 100 "$BOILERPLATE_REPO" "$TEMP_DIR"
cd "$TEMP_DIR"
```

### 3. Identify changed files

```bash
# Get the last synced commit from config
LAST_SYNC=$(jq -r '.last_sync.commit' .groot/boilerplate-sync.json)

# List commits since last sync
git log --oneline "$LAST_SYNC"..HEAD

# List changed files
git diff --name-only "$LAST_SYNC"..HEAD
```

### 4. Filter files and apply AI Decision Framework

**Step 1: Hard skip exclude patterns**

Files matching these patterns are NEVER synced:

- `.env`, `.env.local`, `.env.development`, `.env.production` - local secrets
- `prisma/schema.prisma`, `prisma/migrations/**` - project data model
- `dist/**`, `node_modules/**` - build artifacts
- `pnpm-lock.yaml` - auto-generated
- `README.md` - project docs

> **Note:** `.env.example` IS synced (it's a template, not secrets)

**Step 2: Apply AI Decision Framework**

For all other files, analyze the diff and decide:

#### SYNC (Reusable Core Components):

| Area                  | Paths                                                                                                   | What's Included                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **UI Components**     | `client/src/components/ui/**`                                                                           | All shadcn/Radix components (button, dialog, form, input, toast, table, tabs, etc.)                    |
| **Layout Components** | `client/src/components/layout/**`                                                                       | PageLayout, PageHeader, PageContainer, Section                                                         |
| **Client Utilities**  | `client/src/lib/utils.ts`, `client/src/lib/design-tokens.ts`                                            | cn() helper, design tokens                                                                             |
| **Client Hooks**      | `client/src/hooks/use-toast.ts`                                                                         | Shared React hooks                                                                                     |
| **Base Styles**       | `client/src/index.css`                                                                                  | Tailwind base styles                                                                                   |
| **Server Core**       | `server/src/core/**`                                                                                    | Errors, logger, job queue, storage, kv, ai, async-handler, response-handler, database, base-controller |
| **Middlewares**       | `server/src/middlewares/**`                                                                             | Auth (JWT, admin, basic), rate-limit, validation, error-handler, request-logger, cors                  |
| **Server Utilities**  | `server/src/utils/**`                                                                                   | Array, date, jwt, validation, webauthn utils                                                           |
| **Test Helpers**      | `server/src/test-helpers.ts`, `client/src/test/**`, `server/src/test/**`                                | Shared test utilities                                                                                  |
| **Documentation**     | `docs/**`                                                                                               | All documentation files                                                                                |
| **Env Template**      | `.env.example`                                                                                          | Environment variable template                                                                          |
| **Infrastructure**    | `*.config.*`, `tsconfig.json`, `scripts/**`, `.github/workflows/**`, `.vite-hooks/**`, `.gitleaks.toml` | Configs, CI/CD, build scripts, git hooks                                                               |

#### SKIP (App-Specific Code):

| Area                | Paths                                                | Reason                                                      |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| **Services**        | `server/src/services/**`                             | Business logic                                              |
| **Controllers**     | `server/src/controllers/**`                          | API handlers                                                |
| **Routes**          | `server/src/routes/**`                               | App-specific endpoints                                      |
| **Validations**     | `server/src/validations/**`                          | App-specific schemas                                        |
| **Jobs**            | `server/src/jobs/**`                                 | App-specific background jobs                                |
| **Models**          | `server/src/models/**`                               | App-specific data models                                    |
| **Pages**           | `client/src/pages/**`                                | App-specific UI pages                                       |
| **Stores**          | `client/src/store/**`                                | App-specific state management                               |
| **App Components**  | `client/src/components/*.tsx` (root level only)      | App-specific components (AppSettings, PasskeyManager, etc.) |
| **Client Services** | `client/src/services/**`                             | App-specific API services                                   |
| **Data Model**      | `prisma/schema.prisma`, `prisma/migrations/**`       | Project schema and migrations                               |
| **Secrets**         | `.env`, `.env.local`, `.env.*` (except .env.example) | Local configuration                                         |

#### MERGE (if local differs):

- Show diff between boilerplate and local
- Preserve local customizations
- Apply only reusable core updates

### 5. For each relevant file change

Show the diff and determine:

- **New file**: Copy directly

  ```bash
  cp "$TEMP_DIR/path/to/file" "./path/to/file"
  ```

- **Existing file**: Smart merge (preserve local customizations)
  - Show diff between boilerplate and local
  - Identify what's boilerplate vs project-specific
  - Apply boilerplate changes while keeping local customizations

- **Conflict**: Ask user how to resolve

### 6. Apply changes with user approval

Always show a summary before applying:

```
Changes to apply:
  + new_file.ts (new)
  ~ existing_file.ts (modified)
  ~ config.json (merge)
```

### 7. Update the sync config

After applying changes, update `.groot/boilerplate-sync.json`:

```json
{
  "last_sync": {
    "commit": "<NEW_COMMIT_HASH>",
    "date": "<TODAY'S_DATE>",
    "message": "<SUMMARY_OF_CHANGES>"
  }
}
```

## Package.json AI Sync

When package.json has changes, use AI to intelligently sync dependencies:

### Auto-Apply Rules

**INFRASTRUCTURE (auto-apply):**

- Build tools: typescript, esbuild, vite, vite-plus
- Linting/formatting: oxlint, oxfmt, prettier
- Testing: vitest, @testing-library/\*, playwright
- Core utilities: zod, dotenv, pino, date-fns
- Server core: express, @prisma/client, bcryptjs, jsonwebtoken
- Client core: react, react-router, @radix-ui/\*, tailwindcss, zustand

**FEATURE (skip, don't suggest):**

- Payment: stripe, @stripe/\*
- Email: @sendgrid/mail, nodemailer
- Cloud: @aws-sdk/\* (optional, not all projects need S3)

**MAJOR BUMPS (flag for review):**

- Any dependency where major version changes (e.g., ^4.0.0 → ^5.0.0)
- Present as "REVIEW NEEDED" in sync summary

### AI Sync Process

1. **Compare dependencies** between boilerplate and local package.json
2. **Classify each change** using the rules above
3. **Auto-apply** infrastructure additions and minor/patch updates
4. **Flag** major version bumps for review in the PR description
5. **Skip** feature-specific packages (don't mention them)
6. **Preserve** all local-only dependencies (never remove)

### Example Output

```
## Package.json Changes

### Auto-Applied (Infrastructure)
+ zod: ^3.23.0 (validation library)
+ vitest: ^2.0.0 (testing framework)

### Flagged for Review (Major Version)
~ react: ^18.0.0 → ^19.0.0 (BREAKING - review React 19 migration guide)

### Skipped (Feature-specific)
- @stripe/stripe-js (payment - project may not need)
```

## Merge Strategies

### .gitignore: `append_missing`

Append new entries, don't remove existing ones.

```bash
# Find new gitignore entries
comm -23 <(sort "$TEMP_DIR/.gitignore") <(sort .gitignore)
```

## Exclude Patterns Reference

### Files that are NEVER synced:

| Pattern                | Reason                |
| ---------------------- | --------------------- |
| `README.md`            | Project-specific docs |
| `pnpm-lock.yaml`       | Auto-generated        |
| `.env`                 | Local secrets         |
| `.env.local`           | Local secrets         |
| `.env.development`     | Local secrets         |
| `.env.production`      | Local secrets         |
| `prisma/schema.prisma` | Project data model    |
| `prisma/migrations/**` | Project migrations    |
| `dist/**`              | Build artifacts       |
| `node_modules/**`      | Dependencies          |

> **Note:** `.env.example` IS synced (environment template). `package.json`, `client/**`, `server/**`, and `docs/**` are NOT in exclude patterns. AI decides based on file purpose using the Decision Framework above.

## What Gets Synced (Reference)

### Client-side Reusable Components:

- **27 UI components**: button, dialog, form, input, select, textarea, checkbox, switch, toast, toaster, table, tabs, badge, breadcrumb, card, alert, label, separator, dropdown-menu, popover, sheet, progress, pagination, loading-spinner, loading-skeleton, empty-state, status-badge
- **5 layout components**: PageLayout, PageHeader, PageContainer, Section, index
- **Utilities**: cn() helper, design tokens
- **Hooks**: use-toast
- **Styles**: Base Tailwind CSS

### Server-side Core Modules:

- **Error handling**: AppError, Prisma error handler, base errors
- **Logging**: Pino setup, breadcrumbs, trace context, job stream
- **Job queue**: pg-boss setup (queue, worker, config, constants, error-handler)
- **Storage**: S3 utilities
- **Key-value store**: Keyv with Prisma adapter
- **AI client**: Unified LLM API utilities
- **Core handlers**: async-handler, response-handler, database, base-controller

### Middlewares:

- JWT auth, admin auth, basic auth
- Rate limiting
- Validation (Zod)
- Error handler
- Request logger
- CORS

### Utilities:

- Array helpers
- Date utilities
- JWT utilities
- Validation utilities
- WebAuthn utilities

## Cleanup

After sync, remove the temp directory:

```bash
rm -rf "$TEMP_DIR"
```
