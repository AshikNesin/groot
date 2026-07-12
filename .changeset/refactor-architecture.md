---
"@groot/core": minor
"@groot/shell": minor
"@groot/jobs": minor
"@groot/ui": minor
"groot": minor
---

refactor: reorganize codebase architecture

- Flattened the `packages/` directory, merging `server`, `logger`, and `database` into `core`.
- Renamed `client` to `shell`.
- Moved boilerplate `auth`, `settings`, and `storage` modules out of `apps/web/src/client/pages` and into `@groot/shell`.
- Replaced all legacy paths with their new equivalents in all codebase documentation, tests, and comments.
