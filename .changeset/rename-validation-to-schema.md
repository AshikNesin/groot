---
"@groot/core": patch
"@groot/web": patch
---

Rename `*.validation.ts` to `*.schema.ts`

These files contain only Zod schemas, not validation logic, so the
naming was misleading. Renamed `auth`, `passkey`, `app-settings`,
`storage`, and `todo` validation files to `*.schema.ts` and updated
all imports across `@groot/core`, `@groot/web`, the docs, and
`AGENTS.md`. This is a pure rename — no behavior change.
