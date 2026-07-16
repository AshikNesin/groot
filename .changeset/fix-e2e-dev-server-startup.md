---
"groot": patch
---

fix(e2e): fix e2e test runner — dev server startup, Prisma v7 import, and login selectors

Three issues were preventing `pnpm run test:e2e` from passing:

1. **Dev server failed to start** (`Cannot find module 'watch'`): the memory
   optimization PR inserted `--max-old-space-size=512` _before_ the `watch`
   subcommand in the tsx spawn args. `watch` is a tsx subcommand that must be
   the first argument; when a node flag precedes it, tsx enters "flags + script"
   mode and treats `watch` as a file path. Reordered so `watch` comes first.

2. **Prisma v7 import broken** (`Named export 'PrismaClient' not found`):
   `tests/e2e/global-setup.ts` imported `PrismaClient` from `@prisma/client`,
   but Prisma v7 with a custom generator output path no longer re-exports
   `PrismaClient` from that package. Switched to importing the generated
   client directly (matching `packages/core/src/database/client.ts`).

3. **Login form selector mismatch**: e2e tests targeted `getByLabel(/username/i)`
   but the login form's field label is "Email". Updated selectors to
   `getByLabel(/email/i)`.
