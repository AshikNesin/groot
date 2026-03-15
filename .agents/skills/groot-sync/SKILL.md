---
name: groot-sync
description: Sync infrastructure files from the groot boilerplate repo while preserving project-specific code. Use when syncing updates from groot, checking for boilerplate updates, or the user mentions "groot sync", "sync from groot", "pull boilerplate changes", "update from boilerplate".
metadata:
  tags: sync, boilerplate, groot, infrastructure
---

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
- Include patterns (`sync_config.include_patterns`)
- Exclude patterns (`sync_config.exclude_patterns`)
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

### 4. Filter files by include/exclude patterns

**Include patterns (sync these):**

- `AGENTS.md`
- `.gitleaks.toml`
- `.vite-hooks/**`
- `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, etc.
- `scripts/**`, `tests/**`
- `.claude/**`, `docs/boilerplate/**`
- `prisma.config.ts`, `nixpacks.toml`, `Procfile`

**Exclude patterns (skip these):**

- `README.md`, `package.json`, `pnpm-lock.yaml`
- `.env*`, `prisma/schema.prisma`, `prisma/migrations/**`
- `client/**`, `server/**`, `dist/**`, `node_modules/**`

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

## Merge Strategies

### package.json: `merge_deps`

Only suggest dependency additions. Never remove project-specific dependencies.

```bash
# Compare dependencies
jq '.dependencies' "$TEMP_DIR/package.json"
jq '.devDependencies' "$TEMP_DIR/package.json"
```

### .gitignore: `append_missing`

Append new entries, don't remove existing ones.

```bash
# Find new gitignore entries
comm -23 <(sort "$TEMP_DIR/.gitignore") <(sort .gitignore)
```

## Include/Exclude Patterns Reference

### Files that ARE synced:

| Pattern                | Description             |
| ---------------------- | ----------------------- |
| `AGENTS.md`            | AI agent configuration  |
| `.gitleaks.toml`       | Secret detection config |
| `.vite-hooks/**`       | Git hooks               |
| `tsconfig.json`        | TypeScript config       |
| `vite.config.ts`       | Vite bundler config     |
| `vitest.config.ts`     | Vitest test config      |
| `vitest.workspace.ts`  | Vitest workspace        |
| `playwright.config.ts` | E2E test config         |
| `postcss.config.js`    | PostCSS config          |
| `tailwind.config.js`   | Tailwind CSS config     |
| `sentry.config.js`     | Sentry error tracking   |
| `Procfile`             | Process manager         |
| `pnpm-workspace.yaml`  | pnpm workspace          |
| `prisma.config.ts`     | Prisma client config    |
| `nixpacks.toml`        | Railway/Nixpacks deploy |
| `setup-boilerplate.sh` | Setup script            |
| `scripts/**`           | Utility scripts         |
| `tests/**`             | Test infrastructure     |
| `docs/boilerplate/**`  | Boilerplate docs        |
| `.claude/**`           | Claude settings         |

### Files that are NOT synced:

| Pattern                | Reason                              |
| ---------------------- | ----------------------------------- |
| `README.md`            | Project-specific docs               |
| `package.json`         | Handled specially (merge deps only) |
| `pnpm-lock.yaml`       | Auto-generated                      |
| `.env*`                | Local secrets                       |
| `prisma/schema.prisma` | Project data model                  |
| `prisma/migrations/**` | Project migrations                  |
| `client/**`            | Application frontend                |
| `server/**`            | Application backend                 |
| `dist/**`              | Build artifacts                     |
| `node_modules/**`      | Dependencies                        |

## Cleanup

After sync, remove the temp directory:

```bash
rm -rf "$TEMP_DIR"
```
