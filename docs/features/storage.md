# Storage Feature

The storage feature provides a lightweight AWS S3 file browser with folder navigation, uploads, downloads, deletions, and renames.

> **Note:** The boilerplate ships S3 file management only. Password-protected,
> time-limited public file sharing was removed as an opinionated feature —
> build it in `apps/web/src/server/api/<feature>/` if your app needs it, using the core
> S3 service.

## Architecture Overview

```
Client (Storage page)
  ↳ React Query hooks (`useStorage.ts`)
      ↳ Axios `/api/v1/storage/*`
          ↳ Express routes (shared/storage/)
              ↳ Routes → Services
                  ↳ Core S3 wrapper (core/storage)
```

## Module Structure

```
packages/core/src/storage/
├── storage.routes.ts        # Routes + inline request handlers
├── storage.service.ts       # Business logic
├── storage.validation.ts    # Zod schemas
├── storage.utils.ts         # Utility functions
└── index.ts
```

## API Surface

All endpoints require JWT auth.

| Method | Path                                                       | Notes                                              |
| ------ | ---------------------------------------------------------- | -------------------------------------------------- |
| GET    | `/api/v1/storage/files?prefix=docs/&delimiter=/`           | List files + pseudo folders                        |
| POST   | `/api/v1/storage/files/upload` _(multipart)_               | Single upload with optional `filePath`             |
| POST   | `/api/v1/storage/files/bulk-upload` _(multipart)_          | Up to 50 files (`files` array)                     |
| GET    | `/api/v1/storage/files/download?filePath=docs/invoice.pdf` | Streams file contents                              |
| DELETE | `/api/v1/storage/files`                                    | Body: `{ "filePaths": ["docs/invoice.pdf"] }`      |
| GET    | `/api/v1/storage/files/metadata?filePath=docs/invoice.pdf` | Size + modified timestamp                          |
| POST   | `/api/v1/storage/folders`                                  | Body: `{ "folderPath": "docs/2025/" }`             |
| DELETE | `/api/v1/storage/folders/:folderPath`                      | Removes folder recursively                         |
| PUT    | `/api/v1/storage/files/rename`                             | Body: `{ "oldPath": "a.pdf", "newPath": "b.pdf" }` |

### Example Requests

```bash
# Upload a file
curl -H "Authorization: Bearer <token>" \
  -F "file=@statement.pdf" -F "filePath=docs/statement.pdf" \
  https://groot.localhost/api/v1/storage/files/upload
```

## Environment Variables

```bash
AWS_ACCESS_KEY_ID=localstack
AWS_SECRET_ACCESS_KEY=localstack
AWS_REGION=us-east-1
AWS_DEFAULT_S3_BUCKET=local-bucket
```

For production, use real IAM credentials and bucket.

## Core Storage Service

```typescript
// core/storage/service.ts
export const storageService = {
  upload: async (key: string, body: Buffer, contentType?: string) => {...},
  download: async (key: string) => {...},
  list: async (prefix?: string, delimiter?: string) => {...},
  delete: async (key: string) => {...},
  copy: async (source: string, destination: string) => {...},
  getSignedUrl: async (key: string, expiresIn?: number) => {...},
};
```

## Frontend Integration

`packages/shell/src/pages/storage/Storage.tsx` provides:

- Breadcrumb navigation + "Up" button
- Inline uploads (single + bulk)
- Folder creation dialog
- File rename modal
- Table UI with download, rename, delete actions

React Query keys live in `packages/shell/src/pages/storage/hooks/useStorage.ts`.

## Security & Rate Limiting

- Protected routes use `jwtAuthMiddleware`
- `storageRateLimiter`: 100 requests / 15 min
- `uploadRateLimiter`: 50 requests / 15 min

## Troubleshooting

- **Rate limit exceeded** – Throttle uploads/deletes. Defaults in `rate-limit.middleware.ts`.
- **Local dev without AWS** – Use LocalStack or point to a real bucket.
- **Download shows binary** – It streams raw bytes. Use `curl -o file` or the UI.
