---
"groot": major
---

# Breaking: pnpm workspace restructure

The repository is now a pnpm workspace with `packages/` (boilerplate, synced)
and `apps/web/` (app-owned, not synced).

## What changed

- `client/src/ui` → `packages/ui` (`@groot/ui`)
- `client/src/core` → `packages/client` (`@groot/client`)
- `server/src/core` + `server/src/shared` → `packages/server` (`@groot/server`)
- New `packages/database` (`@groot/database`) wraps the Prisma client
- `server/src/app`, `server/src/index.ts`, `server/src/routes.ts` → `apps/web/src/server/`
- `client/src/app`, `client/src/App.tsx`, `client/src/main.tsx` → `apps/web/src/client/`
- `prisma/schema.prisma` generator output → `packages/database/generated/prisma`

## Migration for downstream repos

Run the layout migration script:

```bash
pnpm groot:sync              # get the new packages/ layout + migrate-layout.ts
pnpm tsx .groot/migrate-layout.ts  # move files, update schema path
pnpm install
pnpm prisma generate
pnpm groot:sync              # get updated import paths
```

## Why

This restructure provides clear physical separation between boilerplate and
app code. `packages/**` is always synced, `apps/**` is never synced. The sync
pattern rules collapse to these two simple rules.
