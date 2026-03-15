# Storage Feature

The storage feature brings a lightweight AWS S3 file browser to the boilerplate. It supports folder navigation, uploads (single or bulk), safe deletions, inline downloads, and password-protected public share links—all guarded by Express basic auth and rate limiting.

## Architecture Overview

```
Client (Storage page)
  ↳ React Query hooks (`useStorage.ts`)
      ↳ Axios `/api/v1/storage/*`
          ↳ Express routes (`storage.routes.ts`)
              ↳ Controllers → Services
                  ↳ Core S3 wrapper (`core/storage`)
                  ↳ Prisma (`PublicFileShare` model)
Public shares
  ↳ `/api/v1/public/files/:shareId` (no auth, rate-limited)
```

### Key server modules

- `core/storage/index.ts` – thin wrapper around `@aws-sdk/client-s3` for upload, download, list, copy, and signed URLs.
- `services/storage.service.ts` – higher-level operations (folder markers, metadata, rename, bulk upload).
- `services/public-share.service.ts` – share creation, password hashing (`bcryptjs`), expiry + access enforcement, cleanup helpers.
- `controllers/storage.controller.ts` – request validation + response marshalling.
- `controllers/public-file.controller.ts` – serves public links without requiring Basic Auth.
- `routes/storage.routes.ts` / `routes/public-file.routes.ts` – Express 5 routers with multer in-memory storage and rate limiting.
- `validations/storage.validation.ts` – Zod schemas for every payload.
- `prisma/schema.prisma` – `PublicFileShare` model tracks share state.

### Environment variables

Add these to your `.env` (defaults exist for LocalStack/dev):

```
AWS_ACCESS_KEY_ID=localstack
AWS_SECRET_ACCESS_KEY=localstack
AWS_REGION=us-east-1
AWS_DEFAULT_S3_BUCKET=local-bucket
```

Point them at a real IAM user + bucket in production.

## API Surface

All endpoints below require Basic Auth unless noted.

| Method   | Path                                                        | Notes                                                         |
| -------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| GET      | `/api/v1/storage/files?prefix=docs/&delimiter=/`            | List files + pseudo folders under `prefix`.                   |
| POST     | `/api/v1/storage/files/upload` _(multipart)_                | Single upload (`file` field) with optional `filePath`.        |
| POST     | `/api/v1/storage/files/bulk-upload` _(multipart)_           | Up to 50 files (`files` array field).                         |
| GET      | `/api/v1/storage/files/download?filePath=docs/invoice.pdf`  | Streams file contents.                                        |
| DELETE   | `/api/v1/storage/files`                                     | Body: `{ "filePaths": ["docs/invoice.pdf"] }`.                |
| GET      | `/api/v1/storage/files/metadata?filePath=docs/invoice.pdf`  | Size + modified timestamp.                                    |
| POST     | `/api/v1/storage/folders`                                   | Body: `{ "folderPath": "docs/2025/" }`.                       |
| DELETE   | `/api/v1/storage/folders/:folderPath`                       | Removes folder recursively (supply URL-encoded path).         |
| PUT      | `/api/v1/storage/files/rename`                              | Body: `{ "oldPath": "docs/a.pdf", "newPath": "docs/b.pdf" }`. |
| POST     | `/api/v1/storage/shares`                                    | Create public share (optional password, expiry, max access).  |
| GET      | `/api/v1/storage/shares?filePath=docs/a.pdf`                | List existing shares for a file.                              |
| DELETE   | `/api/v1/storage/shares/:shareId`                           | Soft-delete share.                                            |
| **GET**  | `/api/v1/public/files/:shareId` _(no auth)_                 | Stream shared file, rate limited to 200 req/15 min.           |
| **GET**  | `/api/v1/public/files/:shareId/info` _(no auth)_            | Metadata for share preview.                                   |
| **POST** | `/api/v1/public/files/:shareId/verify-password` _(no auth)_ | Body `{ password: "..." }` when share is protected.           |

Multer caps uploads at 100 MB per file; the upload endpoint has an additional 50-requests/15-min rate limit.

### Sample cURL

```bash
curl -u user:pass -F "file=@statement.pdf" -F "filePath=docs/statement.pdf" \
  http://localhost:3000/api/v1/storage/files/upload

curl -u user:pass -X POST http://localhost:3000/api/v1/storage/shares \
  -H "Content-Type: application/json" \
  -d '{"filePath":"docs/statement.pdf","expiresInHours":24,"password":"secure123"}'
```

## Frontend Experience

`client/src/pages/Storage.tsx` adds a new route under `/storage` (protected by the existing layout guard) with:

- Breadcrumb navigation + "Up" button for quick traversal.
- Inline uploads (single + bulk) using hidden file inputs and React Query mutations.
- Folder creation dialog and rename modal for files.
- Table UI with download, share, rename, and delete actions per row.
- Share dialog listing active links, password options, and copy/revoke controls.

React Query keys live in `client/src/hooks/api/useStorage.ts` so any component can consume the same cache. All mutations invalidate `['storage']` to keep listings fresh.

## Security & Rate Limiting

- Every `/api/v1/storage/*` request flows through `basicAuthMiddleware` and `storageRateLimiter` (100 req / 15 min).
- Upload-specific limiter `uploadRateLimiter` clamps to 50 requests / 15 min.
- Public downloads (`/api/v1/public/files/*`) skip Basic Auth but use `publicFileRateLimiter` and password verification when configured.
- `PublicFileShare` rows store hashed passwords (bcryptjs) and access counters. Expired shares are automatically revoked via `cleanupExpiredShares()` (hook into a cron if desired).

## Troubleshooting

- **403 from public share** – link is expired or max access count reached. Inspect `/storage/shares` to confirm and recreate.
- **`STORAGE_RATE_LIMIT_EXCEEDED`** – throttle uploads/deletes; defaults can be tuned in `rate-limit.middleware.ts`.
- **Local dev without AWS** – defaults target LocalStack-style credentials. Point `AWS_DEFAULT_S3_BUCKET` at a bucket reachable from the server (or use `localstack` via the AWS SDK endpoint setting inside `core/storage` if you add it).
- **Download returns binary gibberish in API tools** – it is streaming raw bytes; use the React UI or `curl -o file` to save.

With these pieces in place, the boilerplate now mirrors the full-featured storage system from the finance API while staying framework-agnostic.
