---
"groot": minor
---

feat(sync): resolve package.json conflicts deterministically (never via the AI agent)

`package.json` is the most conflict-prone file in `groot:sync` (it changes in
every release) and the one where a malformed result — a trailing comma, a
duplicate key, an unbalanced brace — breaks the whole toolchain. It previously
flowed through the generic `pi` AI resolver like any other conflict, which
occasionally produced subtly broken JSON.

- **`package.json` is now merged programmatically** before the AI flow. Only
  `scripts` / `dependencies` / `devDependencies` are 3-way-merged (per-key:
  unmodified-locally → adopt upstream; modified-locally → local wins); every
  other top-level key (`name`, `version`, `private`, `engines`, pnpm overrides,
  project-only scripts, …) is copied verbatim from the local file. Output is
  guaranteed-valid JSON, with the original indent and trailing newline preserved.

- **New `.groot/package-json-merge.ts`**: the pure merge logic (no I/O),
  extracted so it is fully unit-testable. Parses diff3 conflict markers
  (including multi-hunk and 2-way), reconstructs the three sides, and merges.

- **`.groot/resolve.ts`**: special-cases `package.json` ahead of the AI branch,
  sourcing sides from the diff3 markers already in the file (no boilerplate
  checkout needed in the common case) and falling back to the manifest commits
  when markers are absent or 2-way. Bails to the AI flow only on anomalies
  (unparseable JSON, non-object sides).

- **Lazy resources**: `pi` is now checked and the boilerplate checkout acquired
  only when the AI flow is actually needed. A `package.json`-only resolve
  completes with no clone and no `pi` dependency — relevant for CI and minimal
  environments.

- **Tests** (`tests/server/groot/package-json-merge.test.ts`, 28 cases) cover
  local-wins / adopt-upstream / deletion / fallback / formatting / multi-hunk,
  validated end-to-end against real `git merge-file --diff3` output.
