---
"groot": minor
---

feat(sync): three-way merges + AI conflict resolution (groot sync v4)

Reworks the boilerplate sync workflow so non-overlapping upstream changes no
longer pile up in a manual review list, and the remaining conflicts can be
merged with an AI agent.

- **Three-way merge in `pnpm groot:sync`**: locally-modified files are now
  3-way merged (base = last sync, ours = local, theirs = groot). Clean merges
  apply automatically; only overlapping changes become conflicts. Sync report
  gains `auto-merged` and `conflict` buckets alongside the existing `auto-apply`.

- **`pnpm groot:resolve`** (new `.groot/resolve.ts`): resolves every file in
  `.groot/needs-review/manifest.json` with the pi coding agent
  (`pi -p`), which merges both sides while preserving local customizations and
  removes the conflict markers, then prunes resolved entries and runs `pnpm check`.
  Flags: `--dry-run`, `--file <path>` (repeatable), `--no-verify`, `--model`,
  `--thinking`, `--no-session`.

- **`--skip-conflicts`** on `groot:sync` applies only clean changes and records
  conflicts in the manifest without writing markers into the working tree.

- **CI workflow** (`groot-sync.yml`) now runs `pnpm groot:sync --skip-conflicts`
  so the automated PR stays compilable, and lists auto-apply / auto-merge /
  conflict / drift buckets in the PR body for local resolution.

- **Docs** (`docs/sync-guide.md`, `.agents/skills/groot-sync/SKILL.md`) updated
  for the four-workflow model (Sync → Resolve → Upstream → Release).
