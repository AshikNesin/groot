# Boilerplate Sync Guide

This guide covers the complete lifecycle of keeping child projects in sync with the groot boilerplate.

---

## Overview

The groot sync system has four workflows:

| Workflow     | Direction     | Command               | Purpose                                |
| ------------ | ------------- | --------------------- | -------------------------------------- |
| **Sync**     | groot → child | `pnpm groot:sync`     | Pull + 3-way merge boilerplate updates |
| **Resolve**  | local         | `pnpm groot:resolve`  | AI-resolve conflicts (pi coding agent) |
| **Upstream** | child → groot | `pnpm groot:upstream` | Push bug fixes back to the boilerplate |
| **Release**  | groot         | `pnpm changeset`      | Version and document changes in groot  |

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

# Apply safe changes (auto-apply + clean 3-way merges) and write conflict markers
pnpm groot:sync

# Resolve any remaining conflicts with the pi coding agent
pnpm groot:resolve
```

### How It Works

1. Acquires the groot boilerplate checkout (see [Boilerplate checkout reuse](#boilerplate-checkout-reuse) below)
2. Diffs files changed since `last_sync.commit`
3. Categorizes each file into one bucket:
   - **Auto-apply**: New locally, or matches a sync pattern and is unmodified locally → copied
   - **Auto-merged**: Modified locally but a three-way merge (base = last sync, ours = local, theirs = groot) is clean → merged result written automatically
   - **Conflict**: Modified locally with overlapping changes → conflict markers written and recorded in `.groot/needs-review/manifest.json`
   - **Drift**: Changed in groot but matches no sync pattern (new boilerplate surface) → listed only
   - **Skipped**: Immutable (security) or app-specific paths → reported as counts only
4. Extracts changelog between the last synced version and the latest version
5. Generates a machine-readable `sync-report.json` for CI consumption

Only **Conflict** files need attention. Clean three-way merges are applied
automatically, so non-overlapping upstream changes no longer pile up in a manual
review list.

> `pnpm groot:sync --skip-conflicts` applies only the clean changes and records
> conflicts in the manifest without writing markers into the working tree. CI
> uses this so the automated PR stays compilable.

### Resolving conflicts (`pnpm groot:resolve`)

Conflicts are resolved with the [pi coding agent](https://pi.dev), so the flow
works for any developer, not just inside an agent session.

```bash
pnpm groot:resolve                 # resolve every file in the manifest
pnpm groot:resolve --dry-run       # list pending conflicts only
pnpm groot:resolve --file path.ts  # resolve a single file (repeatable)
pnpm groot:resolve --no-verify     # skip the post-resolution `pnpm check`
pnpm groot:resolve --thinking high # raise pi's reasoning effort
```

`resolve.ts` reads `.groot/needs-review/manifest.json`, ensures each file has
conflict markers (regenerating them from the recorded base/target commits when
sync ran with `--skip-conflicts`), then runs `pi -p` per file. pi merges both
sides while preserving local customizations, removes the markers, and follows
`AGENTS.md` conventions. Resolved entries are pruned from the manifest, and
`pnpm check` runs at the end to verify.

**Prerequisites:** `pi` installed and authenticated.

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
pi          # then /login (subscription) — or set an API key env var
```

### Boilerplate checkout reuse

To avoid re-cloning the boilerplate on every run, `groot:sync` and the `groot:upstream` diff step reuse a local checkout when it's safe to do so:

1. Look for a clone at `~/Code/<boilerplate.name>` (i.e. `~/Code/groot`).
2. Verify its `origin` matches the configured `boilerplate.repo` (HTTPS and SSH URLs are treated as equivalent).
3. Confirm the working tree is **clean** (`git status --porcelain` empty).
4. Check out the default branch and fast-forward it with `git pull --ff-only`.

If any of those checks fail (no local clone, dirty tree, mismatched origin, not a git repo, or the pull is not fast-forwardable), the tool falls back to a fresh shallow clone into a temp directory, which is cleaned up afterwards. A reused local checkout is **never** modified destructively or deleted.

> Tip: keep `~/Code/groot` on `main` with no uncommitted changes and sync runs will skip the clone entirely.

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
  "additional_exclusions": ["client/src/ui/button.tsx", "server/src/core/logger/**"]
}
```

### CI/CD (Automated Sync)

The `.github/workflows/groot-sync.yml` workflow:

- Runs twice daily (12PM and 12AM IST)
- Runs `pnpm groot:sync --skip-conflicts` so the PR contains only clean changes
- Creates a PR with a rich description including:
  - Version diff (e.g., v1.3.0 → v1.5.0)
  - Changelog entries
  - Breaking change warnings
  - Lists of auto-applied, auto-merged, conflict, and drift files
- Conflicts are listed for local resolution via `pnpm groot:resolve`
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
- `client/src/ui/**` — UI component fixes
- `client/src/core/**` — client infrastructure fixes (layouts, api client, stores, hooks)
- Config files, scripts, docs

App-specific code (`server/src/app/**`, `client/src/app/**`, etc.) is never eligible.

---

## Troubleshooting

### "Invalid commit SHA" error during sync

The `last_sync.commit` in your config may reference a commit that's no longer in the shallow clone. Fix by increasing the clone depth or updating the commit to a more recent known-good SHA.

### Files reported as conflicts

A conflict means the file was modified locally **and** groot changed the same
lines, so the three-way merge could not resolve it automatically. Options:

1. **AI-resolve (recommended)**: `pnpm groot:resolve` — the pi coding agent
   merges both sides and removes the conflict markers.
2. **Resolve manually**: Open the file, reconcile the `<<<<<<<` / `=======` /
   `>>>>>>>` markers by hand.
3. **Accept boilerplate version**: Discard local changes for the file, then
   delete the relevant entry from `.groot/needs-review/manifest.json`.
4. **Keep local version**: Add the file to `additional_exclusions` so future
   syncs leave it untouched.

### `pi` not found during resolve

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
pi   # then /login, or export an API key (ANTHROPIC_API_KEY, OPENAI_API_KEY, ...)
```

### Changeset version not detected

Make sure groot has git tags in `v*` format (e.g., `v1.3.0`). The sync tool resolves versions from tags. If no tags exist, it falls back to commit SHAs.

### `gh` CLI not found during upstream

```bash
# macOS
brew install gh

# Then authenticate
gh auth login
```
