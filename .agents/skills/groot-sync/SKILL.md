---
name: groot-sync
description: Sync reusable core components and infrastructure from the groot boilerplate repo. Includes UI components, server core utilities, middlewares, shared hooks, docs, and infrastructure. Also supports upstreaming child-repo fixes back to groot. Triggers on "groot sync", "sync from groot", "pull boilerplate changes", "update from boilerplate", "upstream to groot", "push fix to groot", "changeset", "add changeset".
metadata:
  tags: sync, boilerplate, groot, infrastructure, components, utilities, upstream, versioning, changelog
---

## Groot Sync v5

This skill references the TypeScript sync tools at `.groot/sync.ts`,
`.groot/resolve.ts`, and `.groot/upstream.ts`.

Full documentation: [docs/sync-guide.md](../../docs/sync-guide.md)

## Quick Start

```bash
# Check for available changes (dry run)
pnpm groot:check

# Apply safe changes (auto-apply + clean 3-way merges) and write conflict markers
pnpm groot:sync

# Resolve any remaining conflicts with the pi coding agent
pnpm groot:resolve

# Push local fixes back to groot
pnpm groot:upstream

# Add a changeset (for groot repo changes)
pnpm changeset
```

## How It Works

### Sync (groot → child)

The sync tool uses full-tree snapshot reconciliation (v5) and only escalates
true conflicts:

1. **Reads config** from `.groot/boilerplate-sync.json`
2. **Acquires boilerplate** — reuses a clean `~/Code/groot` checkout (fast-forwarded to its default branch) when available, otherwise clones to a temp directory (with tags for version resolution)
3. **Builds a baseline snapshot** — a parentless git commit of every synced file at the last-sync state, stored as `refs/groot/baseline`. Rebuilt from the checkout when missing, making sync self-healing
4. **Reconciles the full file tree** across three trees: ours (working tree), base (baseline snapshot), theirs (boilerplate HEAD). Categorizes each file using pattern matching (micromatch)
5. **Three-way merges** every locally-modified synced file (base = baseline, ours = local, theirs = groot)
6. **Extracts changelog** between synced version and latest version
7. **Applies** auto-apply (unmodified), clean 3-way merges, and safe deletions (removed upstream + unmodified locally), refusing to overwrite files with uncommitted git changes unless `--force`
8. **Advances state** — updates the baseline ref and `boilerplate-sync.json` last, so a crash mid-apply never loses state
9. **Writes conflict markers** for files that genuinely conflict and records them in `.groot/needs-review/manifest.json`
10. **Writes sync report** (`sync-report.json`) for CI consumption

### Resolve conflicts (AI-assisted)

After sync, resolve the residual conflicts with the [pi coding agent](https://pi.dev) CLI:

```bash
pnpm groot:resolve            # resolve every file in the manifest
pnpm groot:resolve --dry-run  # list pending conflicts only
pnpm groot:resolve --file path/to/file.ts   # resolve one file
```

`resolve.ts` reads `.groot/needs-review/manifest.json`, ensures each file has
conflict markers (regenerating them from the local baseline snapshot and the
recorded target commit when CI ran with `--skip-conflicts`), then runs pi per
file in a locked-down single-shot mode (`pi -p` with no session, no tools, no
extensions/skills/context files). The model merges both sides while preserving
local customizations. The tool validates the response (non-empty, no conflict
markers, retried once with feedback) before writing anything, so a malformed
model response never reaches disk. It follows `AGENTS.md` conventions (fed in
as the system prompt). Resolved entries are pruned from the manifest and
`pnpm check` runs at the end to verify.

**`package.json` is resolved deterministically, never by the AI agent.** It is
the most conflict-prone file and the one where a malformed result (trailing
comma, duplicate key) breaks the whole toolchain. `resolve.ts` instead merges
only `scripts` / `dependencies` / `devDependencies` programmatically (3-way:
unmodified-locally → adopt upstream; modified-locally → local wins); every
other top-level key is copied verbatim from the local file. The pure merge
logic lives in `.groot/package-json-merge.ts`. It falls back to the AI agent
only when the merge can't be handled programmatically (e.g. a side isn't valid
JSON), so a package.json-only resolve needs neither the pi CLI nor a boilerplate
checkout.

> Requires the pi CLI (`npm install -g --ignore-scripts @earendil-works/pi-coding-agent`)
> and authentication (any pi-supported provider key, e.g. `export ZAI_API_KEY=...`,
> or `pi` + /login) — **only when a non-`package.json` conflict is present**.

When you are operating inside an agent session (e.g. Droid) you may instead
resolve the manifest's files directly with your own editing tools — the
manifest gives you each file, its conflict count, and the upstream commit
messages explaining the change.

### Upstream (child → groot)

Push child-repo bug fixes back to the boilerplate:

1. **Compares local files** against last synced version
2. **Shows modified synced files** with diff stats
3. **Interactive selection** of which files to upstream
4. **Creates PR on groot** via GitHub CLI (`gh`)

### Versioning (changesets)

Groot uses [changesets](https://github.com/changesets/changesets) for automated versioning:

1. **Add changeset**: `pnpm changeset` or create a file in `.changeset/`
2. **On merge to main**: GitHub Action creates a "Version Packages" PR
3. **On version PR merge**: Git tag + GitHub Release created automatically

## Sync Rules (Encoded in sync.ts)

### Always Sync (Reusable Core)

| Category            | Paths                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| UI Components       | `client/src/ui/**` (design system primitives)                                                         |
| Client Core         | `client/src/core/**` (layouts, api client, stores, hooks, lib, types, services)                       |
| Client Styles       | `client/src/index.css`                                                                                |
| Server Core         | `server/src/core/**` (drop-in infra: errors, middlewares, utils, logger, job, kv, storage, ai, types) |
| Server Shared       | `server/src/shared/**` (reusable features: auth, passkey, storage, ai, jobs, settings, notification)  |
| Server Test Helpers | `server/src/test-helpers.ts`                                                                          |
| Tests (mirrors)     | `tests/server/{core,shared}/**`, `tests/{server,client}/setup.ts`, `tests/client/components/ui/**`    |
| Infrastructure      | `*.config.*`, `tsconfig.json`, `.github/workflows/**`, `scripts/**`                                   |
| Agent Skills        | `.agents/skills/**` (groot-sync, node, grill-me, improve-codebase-architecture)                       |
| Documentation       | `docs/**`                                                                                             |
| Env Template        | `.env.schema`                                                                                         |

### Never Sync (App-Specific)

| Category            | Paths                                                           |
| ------------------- | --------------------------------------------------------------- |
| App Features        | `server/src/app/**` (project-specific: todo, etc.)              |
| Route Registration  | `server/src/routes.ts`                                          |
| App Entry           | `server/src/index.ts`                                           |
| Client App Layer    | `client/src/app/**` (project features)                          |
| Project-Local Tests | `tests/server/app/**`, `tests/server/routes/**`, `tests/e2e/**` |
| Project Docs        | `README.md`                                                     |
| Lockfile            | `pnpm-lock.yaml`                                                |

### Immutable Exclusions (Security - Cannot Override)

These files are NEVER synced, even if removed from config:

- `.env`, `.env.local`, `.env.development`, `.env.production`
- `prisma/schema.prisma`, `prisma/migrations/**`
- `node_modules/**`, `dist/**`
- `*.pem`, `*.key`, `secrets/**`
- `.groot/boilerplate-sync.json`, `.groot/sync-report.json`, `.groot/needs-review/**`

## Categorization (per changed file)

Each file changed in groot since the last sync lands in exactly one bucket:

| Bucket          | Meaning                                                    | Action                                  |
| --------------- | ---------------------------------------------------------- | --------------------------------------- |
| **Auto-apply**  | New locally, or unmodified locally since last sync         | Copied automatically                    |
| **Auto-merged** | Modified locally but the 3-way merge is clean (no overlap) | Merged result written automatically     |
| **Conflict**    | Modified locally with overlapping changes                  | Markers written + recorded in manifest  |
| **Drift**       | Changed in groot but matches no sync pattern (new surface) | Listed only — adopt manually if desired |
| **Skipped**     | Immutable (security) or app-specific paths                 | Ignored (counts only in output)         |

Only **Conflict** files need attention, and `pnpm groot:resolve` handles those
with the pi coding agent. Clean 3-way merges no longer require manual review.

## Config Format

```json
{
  "boilerplate": {
    "name": "groot",
    "repo": "https://github.com/AshikNesin/groot"
  },
  "last_sync": {
    "version": "1.3.0",
    "commit": "abc1234",
    "date": "2026-03-15T20:00:00Z"
  },
  "additional_exclusions": []
}
```

## CI/CD Integration

### Sync Workflow (`.github/workflows/groot-sync.yml`)

- Runs twice daily (12PM and 12AM IST)
- Uses the TypeScript tool (no external AI service)
- Runs `pnpm groot:sync --skip-conflicts` so the automated PR contains only
  clean changes (auto-apply + clean 3-way merges) and stays compilable
- Creates PR with rich description from `sync-report.json`:
  - Version diff (e.g., v1.3.0 → v1.5.0)
  - Changelog entries between versions
  - Breaking change warnings
  - Auto-applied, auto-merged, conflict, and drift file lists
- Conflicts are listed for the developer to resolve locally with
  `pnpm groot:resolve` (AI resolution does not run in CI)

### Release Workflow (`.github/workflows/release.yml`)

- Triggers on push to `main`
- If changeset files exist → creates "Version Packages" PR
- When version PR merges → creates git tag and GitHub Release

## Writing Changesets (for AI Agents)

When modifying groot's syncable code, create a changeset file:

```bash
# File: .changeset/<random-name>.md
---
"groot": patch
---

fix(core): handle null values in Boom error handler
```

Use `patch` for fixes, `minor` for new features, `major` for breaking changes.

## Manual Override

To add project-specific exclusions, add patterns to `additional_exclusions` in the config:

```json
{
  "additional_exclusions": ["server/src/special-service/**", "client/src/custom-component/**"]
}
```

Note: Immutable exclusions cannot be overridden.
