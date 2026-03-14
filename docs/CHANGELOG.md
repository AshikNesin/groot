# Docs Changelog

## 2026-03-14

- Migrated to Vite+ unified toolchain:
  - Replaced Biome with Vite+ (Oxlint + Oxfmt) for linting and formatting
  - Updated all `vite` imports to `vite-plus`
  - Updated all `vitest` imports to `vite-plus/test`
  - Consolidated config into `vite.config.ts` with `lint`, `fmt`, `staged` blocks
  - Created `vitest.config.server.ts` for server tests with proper alias resolution
  - Fixed `manualChunks` to use function format (Vite 8/Rolldown requirement)
  - Updated `server/src/index.ts` dynamic import from `vite` to `vite-plus`
- Migrated pre-commit hooks to Vite+:
  - Removed `.pre-commit-config.yaml` (no longer need pre-commit CLI)
  - Updated `.vite-hooks/pre-commit` to run Gitleaks + `vp staged`
  - Updated `docs/precommit-hooks.md` documentation
- Cleaned up duplicate test files in `client/src/` and `server/src/`
- Updated `baseline-browser-mapping` to latest version
- Updated `CLAUDE.md` with new tooling documentation

## 2025-11-15

- Seeded documentation hub mirroring Nesin's Finance API style:
  - Added setup guide, architecture overview, development workflow, and testing guide
  - Documented todos API, background jobs, and client patterns
  - Published API request examples and changelog for future updates
