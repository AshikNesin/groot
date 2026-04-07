# Storage Feature

The storage feature provides a lightweight AWS S3 file browser with folder navigation, uploads, downloads, deletions, and password-protected public sharing.

## Architecture Overview

```
Client (Storage page)
  ↳ React Query hooks (`useStorage.ts`)
      ↳ Axios `/api/v1/storage/*`
          ↳ Express routes (shared/storage/)
              ↳ Controllers → Services
                  ↳ Core S3 wrapper (core/storage)
                  ↳ Prisma (PublicFileShare model)
Public shares
  ↳ `/api/v1/public/files/:shareId` (no auth, rate-limited)
```

## Module Structure

```
server/src/shared/storage/
├── storage.routes.ts        # Protected routes
├── storage.controller.ts    # Request handlers
├── storage.service.ts       # Business logic
├── storage.validation.ts    # Zod schemas
├── public-file.routes.ts    # Public routes
├── public-file.controller.ts
└── index.ts

server/src/core/storage/
├── service.ts               # S3 wrapper
├── types.ts                 # Type definitions
└── index.ts
```

## API Surface

All endpoints require JWT auth unless noted.

| Method   | Path                                                        | Notes                                              |
| -------- | ----------------------------------------------------------- | -------------------------------------------------- |
| GET      | `/api/v1/storage/files?prefix=docs/&delimiter=/`            | List files + pseudo folders                        |
| POST     | `/api/v1/storage/files/upload` _(multipart)_                | Single upload with optional `filePath`             |
| POST     | `/api/v1/storage/files/bulk-upload` _(multipart)_           | Up to 50 files (`files` array)                     |
| GET      | `/api/v1/storage/files/download?filePath=docs/invoice.pdf`  | Streams file contents                              |
| DELETE   | `/api/v1/storage/files`                                     | Body: `{ "filePaths": ["docs/invoice.pdf"] }`      |
| GET      | `/api/v1/storage/files/metadata?filePath=docs/invoice.pdf`  | Size + modified timestamp                          |
| POST     | `/api/v1/storage/folders`                                   | Body: `{ "folderPath": "docs/2025/" }`             |
| DELETE   | `/api/v1/storage/folders/:folderPath`                       | Removes folder recursively                         |
| PUT      | `/api/v1/storage/files/rename`                              | Body: `{ "oldPath": "a.pdf", "newPath": "b.pdf" }` |
| POST     | `/api/v1/storage/shares`                                    | Create public share (optional password, expiry)    |
| GET      | `/api/v1/storage/shares?filePath=docs/a.pdf`                | List existing shares for a file                    |
| DELETE   | `/api/v1/storage/shares/:shareId`                           | Soft-delete share                                  |
| **GET**  | `/api/v1/public/files/:shareId` _(no auth)_                 | Stream shared file (rate limited)                  |
| **GET**  | `/api/v1/public/files/:shareId/info` _(no auth)_            | Metadata for share preview                         |
| **POST** | `/api/v1/public/files/:shareId/verify-password` _(no auth)_ | Body `{ password: "..." }` for protected shares    |

### Example Requests

```bash
# Upload a file
curl -H "Authorization: Bearer <token>" \
  -F "file=@statement.pdf" -F "filePath=docs/statement.pdf" \
  https://groot.localhost/api/v1/storage/files/upload

# Create a public share
curl -H "Authorization: Bearer <token>" \
  -X POST https://groot.localhost/api/v1/storage/shares \
  -H "Content-Type: application/json" \
  -d '{"filePath":"docs/statement.pdf","expiresInHours":24,"password":"secure123"}'
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

`client/src/pages/Storage.tsx` provides:

- Breadcrumb navigation + "Up" button
- Inline uploads (single + bulk)
- Folder creation dialog
- File rename modal
- Table UI with download, share, rename, delete actions
- Share dialog with password options

React Query keys live in `client/src/hooks/api/useStorage.ts`.

## Security & Rate Limiting

- Protected routes use `jwtAuthMiddleware`
- `storageRateLimiter`: 100 requests / 15 min
- `uploadRateLimiter`: 50 requests / 15 min
- Public files use `publicFileRateLimiter`: 200 requests / 15 min
- Password verification with bcryptjs hashing
- `PublicFileShare` tracks access counters and expiry

## Troubleshooting

- **403 from public share** – Link expired or max access reached. Check `/storage/shares`.
- **Rate limit exceeded** – Throttle uploads/deletes. Defaults in `rate-limit.middleware.ts`.
- **Local dev without AWS** – Use LocalStack or point to a real bucket.
- **Download shows binary** – It streams raw bytes. Use `curl -o file` or the UI.
