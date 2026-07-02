---
"groot": minor
---

fix: update stale boilerplate setup script + add `pnpm groot:setup`

The setup script had accumulated significant drift from the actual project
convention. Rewritten to match the current codebase:

- **Secrets**: Infisical references → Doppler (the project uses
  `@plugin(@varlock/doppler-plugin)` in `.env.schema`).
- **Git hooks**: Python `pre-commit` tool → Vite+ hooks via `pnpm prepare`
  (`vp config` sets up `.vite-hooks/` with lint-staged + gitleaks).
- **App name**: `RP_NAME` in `.env.schema` (gone) → `config.yml` where
  `app.name` and `passkey.rpName` actually live. Also updates the
  `@initDoppler(project=...)` reference in `.env.schema`.
- **Removed dead seds**: logger service name and Sentry release are now
  derived dynamically from `config.app.name`, not hardcoded. `sentry.config.js`
  doesn't exist. `DATABASE_URL` is auto-derived from `package.json` name.
- **`pnpm groot:setup`** added to `package.json` alongside the existing
  `groot:*` script family.
- Updated `docs/quick-start.md` and `docs/setup-guide.md` to reference the
  new command.
