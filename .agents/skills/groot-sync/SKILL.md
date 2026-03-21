---
name: groot-sync
description: Sync reusable core components and infrastructure from the groot boilerplate repo. Includes UI components, server core utilities, middlewares, shared hooks, docs, and infrastructure. Use when syncing from groot, pulling boilerplate updates, or keeping apps aligned with the source of truth. Triggers on "groot sync", "sync from groot", "pull boilerplate changes", "update from boilerplate".
metadata:
  tags: sync, boilerplate, groot, infrastructure, components, utilities
---

## Groot Sync v2

This skill references the deterministic TypeScript sync tool at `.groot/sync.ts`.

## Quick Start

```bash
# Check for available changes (dry run)
pnpm groot:check

# Apply safe changes
pnpm groot:sync
```

## How It Works

The sync tool is now fully deterministic - no AI interpretation needed:

1. **Reads config** from `.groot/boilerplate-sync.json`
2. **Clones boilerplate** to temp directory
3. **Categorizes files** using pattern matching (micromatch)
4. **Detects conflicts** via git three-way comparison
5. **Applies safe changes** automatically
6. **Flags modified files** for manual review

## Sync Rules (Encoded in sync.ts)

### Always Sync (Reusable Core)

| Category          | Paths                                                            |
| ----------------- | ---------------------------------------------------------------- |
| UI Components     | `client/src/components/ui/**`, `client/src/components/layout/**` |
| Client Lib        | `client/src/lib/utils.ts`, `client/src/lib/design-tokens.ts`     |
| Client Hooks      | `client/src/hooks/use-toast.ts`                                  |
| Client Styles     | `client/src/index.css`                                           |
| Server Core       | `server/src/core/**`                                             |
| Server Middleware | `server/src/middlewares/**`                                      |
| Server Utils      | `server/src/utils/**`                                            |
| Infrastructure    | `*.config.*`, `tsconfig.json`, `.github/workflows/**`            |
| Documentation     | `docs/**`                                                        |
| Env Template      | `.env.schema`                                                    |

### Never Sync (App-Specific)

| Category        | Paths                                                 |
| --------------- | ----------------------------------------------------- |
| Business Logic  | `server/src/services/**`, `server/src/controllers/**` |
| Routes          | `server/src/routes/**`                                |
| Validations     | `server/src/validations/**`                           |
| Jobs            | `server/src/jobs/**`                                  |
| Models          | `server/src/models/**`                                |
| Pages           | `client/src/pages/**`                                 |
| State           | `client/src/store/**`                                 |
| Client Services | `client/src/services/**`                              |

### Immutable Exclusions (Security - Cannot Override)

These files are NEVER synced, even if removed from config:

- `.env`, `.env.local`, `.env.development`, `.env.production`
- `prisma/schema.prisma`, `prisma/migrations/**`
- `node_modules/**`, `dist/**`
- `*.pem`, `*.key`, `secrets/**`

## Conflict Detection

The tool compares each local file against the last synced version from git:

1. **New file in boilerplate** → Auto-apply (safe to add)
2. **Unmodified locally** → Auto-apply (no conflict)
3. **Modified locally** → Flag for review

Modified files are NOT automatically applied - they appear in the "Needs Review" section for manual inspection.

## Config Format

```json
{
  "boilerplate": {
    "name": "groot",
    "repo": "https://github.com/AshikNesin/groot"
  },
  "last_sync": {
    "commit": "abc1234",
    "date": "2026-03-15T20:00:00Z"
  },
  "exclude_patterns": []
}
```

## CI/CD Integration

The `.github/workflows/groot-sync.yml` workflow:

- Runs twice daily (12PM and 12AM IST)
- Uses the TypeScript tool (no external AI service)
- Creates PR with changes for review
- Only auto-applies safe changes

## Manual Override

To add project-specific exclusions, add patterns to `exclude_patterns` in the config:

```json
{
  "exclude_patterns": ["server/src/special-service/**", "client/src/custom-component/**"]
}
```

Note: Immutable exclusions cannot be overridden.
