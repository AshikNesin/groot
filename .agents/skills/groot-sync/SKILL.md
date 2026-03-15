---
name: groot-sync
description: Sync infrastructure files from the groot boilerplate repo while preserving project-specific code. Use when syncing updates from groot, checking for boilerplate updates, or the user mentions "groot sync", "sync from groot", "pull boilerplate changes", "update from boilerplate".
metadata:
  tags: sync, boilerplate, groot, infrastructure
---

## Smart Sync Rules

**CRITICAL PRESERVATION RULES:**

- Never override project-specific business logic, routes, or features
- Only sync infrastructure/utility patterns (error handling, logging, middlewares)
- If the project has REMOVED or MODIFIED boilerplate defaults (schema, routes, seed data), do NOT re-add them
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

- `.env*` - local secrets
- `prisma/schema.prisma`, `prisma/migrations/**` - project data model
- `dist/**`, `node_modules/**` - build artifacts
- `pnpm-lock.yaml` - auto-generated
- `README.md` - project docs

**Step 2: Apply AI Decision Framework**

For all other files, analyze the diff and decide:

#### SYNC (infrastructure/tooling):

- Config files (`*.config.*`, `tsconfig.json`, etc.)
- Build scripts (`scripts/**`)
- CI/CD (`.github/workflows/**`)
- Git hooks (`.vite-hooks/**`, `.gitleaks.toml`)
- Docs about boilerplate (`docs/boilerplate/**`)
- Core utilities (`server/src/core/**`, `client/src/lib/**`)
- Middlewares (`server/src/middlewares/**`)
- Route definitions (`server/src/routes/**`)
- Validation schemas (`server/src/validations/**`)
- Shared hooks (`client/src/hooks/**`)
- Shared UI components (`client/src/components/ui/**`)

#### SKIP (application code):

- Business logic (`server/src/services/**`)
- Controllers (`server/src/controllers/**`)
- Page components (`client/src/pages/**`)
- State stores (`client/src/store/**`)
- Feature-specific code

#### MERGE (if local differs):

- Show diff between boilerplate and local
- Preserve local customizations
- Apply only infrastructure/core updates

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

## Exclude Patterns Reference

### Files that are NEVER synced:

| Pattern                | Reason                              |
| ---------------------- | ----------------------------------- |
| `README.md`            | Project-specific docs               |
| `package.json`         | Handled specially (merge deps only) |
| `pnpm-lock.yaml`       | Auto-generated                      |
| `.env*`                | Local secrets                       |
| `prisma/schema.prisma` | Project data model                  |
| `prisma/migrations/**` | Project migrations                  |
| `dist/**`              | Build artifacts                     |
| `node_modules/**`      | Dependencies                        |

> **Note:** `client/**` and `server/**` are NOT in exclude patterns. AI decides based on file purpose using the Decision Framework above.

## Cleanup

After sync, remove the temp directory:

```bash
rm -rf "$TEMP_DIR"
```
