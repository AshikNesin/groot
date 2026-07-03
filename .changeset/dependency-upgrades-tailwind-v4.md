---
"groot": minor
---

chore(deps): update all packages to latest; migrate Vite+ 0.2, Tailwind v4, TypeScript 6

Updates 50+ dependencies to their latest versions and migrates the toolchain to
Vite+ 0.2, Tailwind CSS v4, and TypeScript 6. Deprecated packages are replaced
and latent lint warnings cleaned up.

### Toolchain migrations

- **Vite+ 0.1 → 0.2** via `vp migrate`. The catalog now pins real `vitest@4.1.9`
  — the `@voidzero-dev/vite-plus-test` wrapper is removed in 0.2.x, which fixes
  `vp test`: it previously could not resolve the `vitest` bin through the stale
  `vitest → @voidzero-dev/vite-plus-test` catalog alias (the wrapper ships
  `dist/cli.js` but no `bin` field).
- **Tailwind CSS v3 → v4.** PostCSS now uses `@tailwindcss/postcss`, and the CSS
  entry uses `@import "tailwindcss"` + `@config`, preserving the existing
  shadcn/HSL design-token theme and the `tailwindcss-animate` plugin.
- **TypeScript 5.9 → 6.** Removed the deprecated `baseUrl` (made `paths`
  relative) to satisfy the TS6 deprecation.
- **Vite 8.** `server.hmr.*` → `server.ws.*` for the HMR websocket config.

### Breaking dependency changes

- `@mariozechner/pi-ai` → `@earendil-works/pi-ai@0.80` (the `@mariozechner`
  package is deprecated). Imports use the `/compat` shim, which preserves the
  existing `stream`/`complete`/`getModel` API surface.
- `bcryptjs` 2 → 3, which ships its own types, so `@types/bcryptjs` is removed.
- Other majors: `express-rate-limit` 7 → 8, `files-sdk` 1 → 2, `js-yaml` 4 → 5
  (fixed the named-export import in `config.loader`), `prisma` 7.8,
  `pg-boss` 12.25, `lucide-react` 0.x → 1.x, `react`/`react-dom` 19.2,
  `@sentry/node` 10.63, `@tanstack/react-query` 5.101, and more.

### Code cleanup

- Resolved 13 pre-existing oxlint `no-unused-vars` warnings: removed unused
  imports, an unused controller parameter, and switched to an optional catch
  binding.
- Fixed a `ThinkingLevel` local-use bug in the AI module's type re-exports.

### Validation

- `pnpm build` ✓, `pnpm test` (140/140) ✓, `pnpm lint` (0 warnings) ✓.
