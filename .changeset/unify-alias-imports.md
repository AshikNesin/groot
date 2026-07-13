---
"@groot/core": patch
"@groot/shell": patch
"@groot/jobs": patch
---

refactor: unify cross-package imports on @groot/\* aliases

Standardizes import style so cross-directory imports always use the
package alias (`@groot/core/*`, `@groot/shell/*`, `@groot/jobs/*`) while
same-directory imports stay relative (`./`). Previously these were mixed —
even within a single file (e.g. `../kv` next to `@groot/core/logger`) —
making import style inconsistent across the codebase.

## @groot/core

- Converted all cross-directory `../` imports to `@groot/core/*` aliases
  across `ai`, `auth`, `config`, `kv`, `middlewares`, `notification`,
  `passkey`, `settings`, `storage`, and `utils`.
- Same-directory `./` imports left unchanged.
- Prisma `../../generated/prisma/client` imports in `database/` kept
  relative (no alias maps to the generated output outside `src/`).

## @groot/shell

- Converted cross-directory `../` imports to `@groot/shell/*` aliases
  across `components`, `hooks`, `lib`, `pages/storage`, `services`, and
  `store`.

## @groot/jobs

- Converted cross-directory `../` imports to `@groot/jobs/client/*`
  aliases across the client `components/`.
