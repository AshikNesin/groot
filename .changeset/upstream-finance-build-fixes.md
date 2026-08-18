---
"groot": patch
---

fix(build): make Sentry naming configurable and harden the prod bundle externals

- Sentry release tags now derive from `package.json` `name` instead of a hardcoded `groot` prefix (both `scripts/build.mjs` and `vite.config.ts`), and the upload project is `SENTRY_PROJECT` (falling back to the package name). Child repos no longer need to fork these files just to rebrand Sentry.
- Externalize `vite-plus` and `@vitejs/plugin-react` in the server bundle. `packages/core/src/server.ts` dynamically imports `vite-plus` in dev; bundling it left stray `import("vite")` calls in `dist/bundle.js`, and both packages are devDependencies that don't exist in production — boot fails with `ERR_MODULE_NOT_FOUND` / `Cannot find package vite`.
- `copyPublicAssets` now copies from `apps/web/public` (Vite's `publicDir`) instead of the non-existent `apps/web/src/server/public`.
- `.gitignore`: also ignore `packages/core/generated` (the current location of the generated Prisma client; the old `packages/database/generated/prisma` entry predates the v2 layout).
- `.env.schema`: new `SENTRY_PROJECT` build-time variable.
