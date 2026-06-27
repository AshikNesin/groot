# Boilerplate Sync Guide

This guide covers the complete lifecycle of keeping child projects in sync with the groot boilerplate.

---

## Overview

The groot sync system has three workflows:

| Workflow     | Direction     | Command               | Purpose                                    |
| ------------ | ------------- | --------------------- | ------------------------------------------ |
| **Sync**     | groot → child | `pnpm groot:sync`     | Pull boilerplate updates into your project |
| **Upstream** | child → groot | `pnpm groot:upstream` | Push bug fixes back to the boilerplate     |
| **Release**  | groot         | `pnpm changeset`      | Version and document changes in groot      |

---

## How Versioning Works

Groot uses [changesets](https://github.com/changesets/changesets) for versioning:

1. **When making changes to groot**, add a changeset file:

   ```bash
   pnpm changeset
   ```

   This asks for the change type (patch/minor/major) and a description.

2. **On merge to `main`**, a GitHub Action creates a "Version Packages" PR that:
   - Bumps the version in `package.json`
   - Updates `CHANGELOG.md` with all pending changeset entries
   - Removes consumed changeset files

3. **When the version PR merges**, a git tag (e.g., `v1.3.0`) and GitHub Release are created.

### Changeset Types

| Type    | When to use                          | Example                                   |
| ------- | ------------------------------------ | ----------------------------------------- |
| `patch` | Bug fixes, typo corrections          | `fix(core): handle null in error handler` |
| `minor` | New features, non-breaking additions | `feat(ui): add DatePicker component`      |
| `major` | Breaking changes requiring migration | `feat!: change createRequestLogger API`   |

### Writing a Changeset (for AI Agents)

Create a markdown file in `.changeset/` with a random name:

```markdown
---
"groot": patch
---

fix(core): handle null values in Boom error handler

The `Boom.badRequest()` factory now gracefully handles null error messages
instead of throwing a TypeError.
```

---

## Syncing (groot → child)

### Quick Start

```bash
# Check what's available (dry run)
pnpm groot:check

# Apply safe changes
pnpm groot:sync
```

### How It Works

1. Clones the groot repo to a temp directory (with tags for version resolution)
2. Diffs files changed since `last_sync.commit`
3. Categorizes each file:
   - **Auto-apply**: File matches sync patterns and is unmodified locally
   - **Needs review**: File matches sync patterns but was modified locally
   - **Skipped**: File matches skip patterns or doesn't match sync patterns
4. Extracts changelog between the last synced version and the latest version
5. Generates a machine-readable `sync-report.json` for CI consumption

### What Gets Synced

See the [groot-sync skill](./../.agents/skills/groot-sync/SKILL.md) for the complete list of sync patterns.

### Configuration

The sync state is tracked in `.groot/boilerplate-sync.json`:

```json
{
  "boilerplate": {
    "name": "groot",
    "repo": "https://github.com/AshikNesin/groot"
  },
  "last_sync": {
    "version": "1.3.0",
    "commit": "abc1234",
    "date": "2026-06-15T00:00:00Z"
  },
  "additional_exclusions": []
}
```

### Adding Project-Specific Exclusions

If your project has customized a synced component and you don't want it overwritten:

```json
{
  "additional_exclusions": ["client/src/components/ui/button.tsx", "server/src/core/logger/**"]
}
```

### CI/CD (Automated Sync)

The `.github/workflows/groot-sync.yml` workflow:

- Runs twice daily (12PM and 12AM IST)
- Creates a PR with a rich description including:
  - Version diff (e.g., v1.3.0 → v1.5.0)
  - Changelog entries
  - Breaking change warnings
  - List of auto-applied and needs-review files
- Can be triggered manually via `workflow_dispatch`

---

## Upstream (child → groot)

When you fix a bug in a synced file within a child project, push it back to groot:

### Quick Start

```bash
# Interactive mode — select which files to upstream
pnpm groot:upstream

# Dry run — see what would be upstreamed
pnpm groot:upstream --dry-run

# Upstream all modified synced files
pnpm groot:upstream --all
```

### Prerequisites

- [GitHub CLI (`gh`)](https://cli.github.com/) must be installed and authenticated:
  ```bash
  brew install gh
  gh auth login
  ```

### How It Works

1. Compares local synced files against the last synced version in groot
2. Shows modified files with diff stats (e.g., `+5 -2`)
3. In interactive mode, lets you select which files to upstream
4. Creates a branch on groot (`upstream/<app-name>/<date>`)
5. Opens a PR on the groot repo via `gh pr create`

### What Can Be Upstreamed

Only files matching the sync patterns can be upstreamed:

- `server/src/core/**` — infrastructure fixes
- `server/src/shared/**` — shared feature fixes
- `client/src/components/ui/**` — UI component fixes
- `client/src/components/layout/**` — layout fixes
- Config files, scripts, docs

App-specific code (`server/src/app/**`, `client/src/pages/**`, etc.) is never eligible.

---

## Troubleshooting

### "Invalid commit SHA" error during sync

The `last_sync.commit` in your config may reference a commit that's no longer in the shallow clone. Fix by increasing the clone depth or updating the commit to a more recent known-good SHA.

### Files stuck in "Needs Review"

This means the file was modified locally since the last sync. Options:

1. **Accept boilerplate version**: Delete your local changes, run `pnpm groot:sync` again
2. **Keep local version**: Add the file to `additional_exclusions`
3. **Merge manually**: Compare the diff and merge by hand

### Changeset version not detected

Make sure groot has git tags in `v*` format (e.g., `v1.3.0`). The sync tool resolves versions from tags. If no tags exist, it falls back to commit SHAs.

### `gh` CLI not found during upstream

```bash
# macOS
brew install gh

# Then authenticate
gh auth login
```
