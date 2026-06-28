---
"groot": minor
---

feat(env): upgrade varlock to 1.9.0, switch secrets plugin from Infisical to Doppler, and wire it into .env.schema

- Bump `varlock` from ^0.5.0 to ^1.9.0 (required — `@varlock/doppler-plugin`
  needs `varlock ^1.8.0`). The `varlock/env` and `varlock/auto-load` runtime
  entry points and the `varlock run` CLI surface are unchanged.
- Replace `@varlock/infisical-plugin` with `@varlock/doppler-plugin` (^2.0.0).
- Wire the Doppler plugin into `.env.schema` (`@plugin` + `@initDoppler`) and add
  a `DOPPLER_TOKEN` bootstrap item (`@type=dopplerServiceToken`, `@internal`).
- Gate the always-required production secrets (`JWT_SECRET_KEY`,
  `ADMIN_AUTH_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) behind
  `if(forEnv(production), doppler(), <dev-fallback>)`, mirroring the existing
  `DATABASE_URL` pattern.

Precedence: an ambient env var always wins over the resolver, so production is
supported two ways — set secrets directly via the hosting platform (Doppler is
never contacted), OR set only `DOPPLER_TOKEN` and let varlock fetch them.
Development stays zero-config: the `forEnv(production)` guard short-circuits so
Doppler is never contacted and the placeholder token is never sent. Optional
per-provider keys (AI providers, PUSHOVER, SENTRY) are left unwired with an
inline recipe, since `doppler()` hard-errors on a missing secret.

- Update the environment skill docs to describe the Doppler plugin and setup.

Behavioral change for production: previously an unset required secret would
fall back to a committed placeholder string and the app would boot insecurely.
Now, if a secret is not provided via the ambient environment and Doppler is not
configured, varlock fails fast at boot with a clear resolution error. Deploys
that already set real secrets via the hosting platform are unaffected.
Development and test are unaffected.
