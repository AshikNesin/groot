---
"groot": patch
---

fix(setup): correct script ordering + add git repo guard

Two robustness fixes to the setup script:

- **Install dependencies before hooks**: the old order called `pnpm prepare`
  (→ `vp config`) before `pnpm install`, so on a fresh clone with no
  `node_modules` it would fail because `vp` wasn't installed yet. Now
  `pnpm install` runs first and auto-triggers the `prepare` lifecycle
  script, which installs hooks in one step.
- **Fail fast if not a git repo**: clear error instead of a cryptic
  `vp config` failure when run outside a git repository.
