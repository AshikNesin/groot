---
"groot": minor
---

Performance, architecture, and accessibility pass driven by `react-doctor`. No
breaking API changes.

#### Performance

- Parallelize independent awaits in the boilerplate sync engine
  (`.groot/lib/engine.ts`) — reconcile + apply phases now fan out per file.
- Code-split CodeMirror behind `React.lazy` so it lands in its own chunk
  instead of the main bundle.
- Fan out pg-boss per-queue setup and break the job index↔worker cycle.
- Single-pass job filters and keyboard-toggle selection.

#### Architecture

- Split the four largest pages into focused components + custom hooks:
  `Jobs` (1433 → 132), `Storage` (629 → 171), `JobDetail` (474 → 128),
  `AppSettings` (339 → 206). Each sub-300 lines now.
- Fix two `react-hooks/exhaustive-deps` findings with correct `useCallback`
  deps (no suppression comments).
- Hoist pure helpers to module scope; adopt Zod 4 top-level format factories;
  make WebAuthn RP constants module-private.

#### Fixes

- Accessibility: breadcrumb current-page item now uses `aria-current="page"`
  instead of an incorrect `role="link"`; keyboard parity for input-group.
- Remove derived-state syncing effects in favor of derived values.
- Drop unused UI variant exports (`buttonVariants`, `badgeVariants`,
  `tabsListVariants`, `SkeletonVariants`) and the unused `TodoModel` class
  export.

#### Tooling

- Add `react-doctor` CI workflow, triage skill, and `doctor` script.
- Drop redundant `@radix-ui/react-*` packages (covered by the `radix-ui`
  meta-package) and unused `p-limit`.
- Delete the server bundle sourcemap after build; harden release install and
  add pnpm supply-chain gating.
