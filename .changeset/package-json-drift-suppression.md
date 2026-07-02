---
"groot": patch
---

fix(groot): suppress package.json sync markers for non-managed keys

`package.json` no longer raises conflict markers when only non-managed keys
(`name`, `version`, `description`, `packageManager`, …) differ between the
boilerplate and the local repo.

- **Root cause:** sync ran `package.json` through `git merge-file`, which emits
  diff3 markers for _any_ difference — so a boilerplate version bump
  (`1.7.0` → `1.8.0`) or description change showed up as a conflict even though
  `resolve.ts` later discarded those fields deterministically.
- **Fix:** route `package.json` through the deterministic `mergePackageJson`
  during sync. Only `scripts` / `dependencies` / `devDependencies` flow
  boilerplate → child; every other key is copied verbatim from the local file.
  When only non-managed keys differ the merge is a no-op (no marker, no manifest
  entry); when managed keys change the result is written cleanly as
  `auto-merged` (no markers). Falls back to the marker-based path only if the
  JSON is unparseable.
- **Consistency:** this matches the existing `resolve.ts` behavior, which already
  resolved every `package.json` conflict deterministically (never via the AI
  agent) — so the markers were redundant ceremony.
