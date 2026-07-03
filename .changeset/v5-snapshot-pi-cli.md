---
"groot": major
---

feat(groot): v5 snapshot reconciliation + pi CLI resolve

Rewrites the boilerplate sync engine from commit-diff detection to full-tree
snapshot reconciliation, and replaces the in-process `@cline/sdk` agent with
the pi coding agent CLI for conflict resolution.

### Sync engine (v5 snapshot reconciliation)

- **Git-tracked baseline.** A parentless snapshot commit of every synced file
  at the last-sync state is stored as `refs/groot/baseline`. The baseline is
  rebuilt from the boilerplate checkout when missing or stale, making sync
  self-healing — no more "Invalid commit SHA" errors from shallow clones or
  rebased upstream history.
- **Full-tree reconciliation.** Every synced file is classified across three
  trees (ours / base / theirs) in a single pass via a pure decision table
  (`.groot/lib/reconcile.ts`), replacing the old per-commit diff walk.
- **Safe deletion sync.** Files removed upstream are deleted locally only when
  unmodified since the last sync; locally-modified deletions are flagged for
  review instead of silently dropped.
- **Clean-tree precondition + crash-safe apply.** Sync refuses to overwrite
  files with uncommitted git changes unless `--force` is passed. The baseline
  ref and `boilerplate-sync.json` are advanced last, so a crash mid-apply never
  loses state or marks conflicts as resolved.
- **Shared modules.** Sync logic extracted into `.groot/lib/` (patterns,
  config, git, acquire, baseline, reconcile, changelog, engine) to prevent
  drift between `sync.ts`, `resolve.ts`, and `upstream.ts`.

### Resolve (pi CLI)

- **Replaces `@cline/sdk`.** Conflict resolution now shells out to the
  [pi](https://pi.dev) coding agent CLI (`pi -p`) in a locked-down single-shot
  mode: no session, no tools, no extensions, no skills, no prompt templates,
  no context files.
- **Validated output.** The model's response is checked (non-empty, no conflict
  markers) before anything is written to disk. On failure it retries once with
  feedback, so a malformed response never reaches the working tree.
- **Prerequisite change.** Install pi globally
  (`npm install -g --ignore-scripts @earendil-works/pi-coding-agent`) and
  authenticate with any pi-supported provider key (e.g. `ZAI_API_KEY`) or
  `pi` + `/login`. `@cline/sdk` is no longer a dependency.

### Tests

- 22 unit tests for the reconciliation decision table
  (`tests/server/groot/reconcile.test.ts`).
- 7 integration tests with fixture git repos covering check mode, apply +
  deletion sync, 3-way merge conflicts, `--skip-conflicts`, `--force`
  precondition, modified-file-deleted-upstream, and baseline self-healing
  (`tests/server/groot/sync-engine.test.ts`).
