---
"groot": minor
---

refactor(storage): drop the built-in public file-sharing feature — keep the S3 core

Same treatment as the AI cleanup. The boilerplate shipped a full public
file-sharing product (password-protected, time-limited, access-counted links)
layered on top of plain S3 upload/download. That's an opinionated SaaS feature
every consumer inherited whether they needed a share-links product or not. The
S3 file-management core is what earns its place; the sharing layer should live
in `server/src/app/<feature>/` for apps that actually want it.

Removed (was forcing a sharing product into the boilerplate):

- `server/src/shared/storage/public-share.service.ts` — share create/revoke,
  JWT share tokens, bcrypt password verification, access-count incrementing,
  expiry cleanup (~250 lines).
- `server/src/shared/storage/public-file.controller.ts` +
  `public-file.routes.ts` — the `/api/v1/public/files` surface
  (`serve`, `info`, `verify-password`).
- `storage.controller.ts` / `storage.routes.ts` / `storage.validation.ts` —
  the `/storage/shares` CRUD endpoints and their Zod schemas
  (`createPublicShareSchema`, `listSharesForFileSchema`,
  `verifySharePasswordSchema`).
- `storage/index.ts` — the `publicShare` / `PublicFileController` /
  `PublicFileRoutes` exports.
- **Core leaks**: `generateShareToken` / `verifyShareToken` in `jwt.utils.ts`
  (share-only), `SHARE_ACCESS_DENIED` and `PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED`
  error codes, `publicFileRateLimiter`, and `config.rateLimits.publicFile`
  (schema + `config.example.yml`).
- **DB**: `PublicFileShare` model, with a generated `drop_public_file_shares`
  migration (diffed via `prisma migrate diff`, not hand-written; the baseline
  migration is untouched).
- **Client**: the share dialog, share hooks (`useStorageShares`,
  `useCreateShare`, `useRevokeShare`), `PublicShare` type, and the Share button
  in the Storage page.
- Stale `/api/v1/public/files` + `/storage/shares` references across `docs/`.

Kept (the S3 core):

- `storage.service.ts` / `storage.controller.ts` / `storage.routes.ts` —
  plain S3 upload / download / list / delete / rename / folder ops.
- `storage.utils.ts` (`sanitizeFileName`, `getContentType` — used by the
  remaining storage controller).
- `storageRateLimiter` + `uploadRateLimiter`.

> Note for consumers syncing from groot: if you built on the removed sharing
> endpoints (`/api/v1/public/files/*`, `/storage/shares/*`), the `PublicShare*`
> types, or `publicFileRateLimiter`, they disappear on the next `groot:sync`.
> Move that code into your own `app/` layer before syncing. The schema/migrations
> are never synced, so your `public_file_shares` table is untouched.

Verified: `prisma validate` + `prisma generate` clean, `vp check` 0 errors,
`pnpm test` 83 passing.
