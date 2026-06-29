---
"groot": patch
---

refactor(config): remove the dead `features.enableNotifications` flag

`config.features.enableNotifications` was defined in the schema, config files,
and docs, but **read by nothing**. The notification service derives its own
enabled state directly from env vars (`PUSHOVER_USER_KEY` +
`PUSHOVER_API_TOKEN`), so this flag promised to control something it never did.
Dead config lies to readers — removed it.

Changes:

- `server/src/core/config/config.schema.ts`: drop the `features` block.
- `config.yml` / `config.example.yml`: remove the `features:` section.
- `server/src/core/config/index.ts`: drop the stale doc-comment example.
- `docs/config.md`: drop the `features.enableNotifications` settings row.
- `tests/server/core/config/config.test.ts`: drop the `features` assertions;
  the boolean-coercion test now exercises `jobs.enabled` instead.

Verified: `vp check` 0 errors, `pnpm test` 83 passing.
