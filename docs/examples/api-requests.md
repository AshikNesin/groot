# API request recipes

Copy-ready `curl` snippets for every endpoint. Replace `<jwt-token>` with the
JWT returned by `/api/v1/auth/login`, and `<admin-key>` with your
`ADMIN_AUTH_KEY`.

> Most `/api/v1/*` routes are **JWT-protected**. Get a token first, then pass
> it via `Authorization: Bearer <jwt-token>`. User creation is the one
> admin-only operation (`X-Admin-Auth-Key`).

## Get a token (login first)

```bash
# Login → returns { token, user }
TOKEN=$(curl -s -X POST https://groot.localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r .token)
```

## Health check

```bash
curl https://groot.localhost/health
```

## Todos (JWT)

```bash
# List
curl -H "Authorization: Bearer $TOKEN" https://groot.localhost/api/v1/todos

# Create
curl -H "Authorization: Bearer $TOKEN" -X POST https://groot.localhost/api/v1/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Draft documentation"}'

# Toggle completion
curl -H "Authorization: Bearer $TOKEN" -X PUT https://groot.localhost/api/v1/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# Delete
curl -H "Authorization: Bearer $TOKEN" -X DELETE https://groot.localhost/api/v1/todos/1
```

## Jobs (JWT)

```bash
# Queue a job immediately
curl -H "Authorization: Bearer $TOKEN" -X POST https://groot.localhost/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"jobName":"todo-summary","data":{}}'

# Schedule with cron (nightly at 3am)
curl -H "Authorization: Bearer $TOKEN" -X POST https://groot.localhost/api/v1/jobs/schedule \
  -H "Content-Type: application/json" \
  -d '{"jobName":"todo-cleanup","cron":"0 3 * * *","data":{"daysToKeep":45}}'

# Inspect failed jobs
curl -H "Authorization: Bearer $TOKEN" \
  "https://groot.localhost/api/v1/jobs/state/failed?limit=20"

# Retry a specific job
curl -H "Authorization: Bearer $TOKEN" -X POST \
  https://groot.localhost/api/v1/jobs/todo-cleanup/job-123/retry

# Delete a job
curl -H "Authorization: Bearer $TOKEN" -X DELETE \
  https://groot.localhost/api/v1/jobs/todo-cleanup/job-123
```

## Storage (JWT)

```bash
# List files (optional prefix filter)
curl -H "Authorization: Bearer $TOKEN" \
  "https://groot.localhost/api/v1/storage/files?prefix=docs/&delimiter=/"

# Upload a single file (multipart)
curl -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf" -F "filePath=docs/document.pdf" \
  https://groot.localhost/api/v1/storage/files/upload

# Bulk upload (up to 50 files)
curl -H "Authorization: Bearer $TOKEN" \
  -F "files=@file1.pdf" -F "files=@file2.pdf" \
  https://groot.localhost/api/v1/storage/files/bulk-upload

# Download
curl -H "Authorization: Bearer $TOKEN" \
  "https://groot.localhost/api/v1/storage/files/download?filePath=docs/document.pdf" -o document.pdf

# File metadata
curl -H "Authorization: Bearer $TOKEN" \
  "https://groot.localhost/api/v1/storage/files/metadata?filePath=docs/document.pdf"

# Create a folder
curl -H "Authorization: Bearer $TOKEN" -X POST https://groot.localhost/api/v1/storage/folders \
  -H "Content-Type: application/json" \
  -d '{"folderPath":"archive/2024/"}'

# Rename a file
curl -H "Authorization: Bearer $TOKEN" -X PUT https://groot.localhost/api/v1/storage/files/rename \
  -H "Content-Type: application/json" \
  -d '{"oldPath":"docs/old.pdf","newPath":"docs/new.pdf"}'

# Delete files
curl -H "Authorization: Bearer $TOKEN" -X DELETE https://groot.localhost/api/v1/storage/files \
  -H "Content-Type: application/json" \
  -d '{"filePaths":["docs/document.pdf"]}'
```

## Auth & user management

```bash
# Create a new user (admin-only — uses X-Admin-Auth-Key, NOT JWT)
curl -X POST https://groot.localhost/api/v1/auth/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-Auth-Key: $ADMIN_KEY" \
  -d '{"email":"newuser@example.com","password":"secure-password"}'

# List all users (admin-only)
curl -H "X-Admin-Auth-Key: $ADMIN_KEY" https://groot.localhost/api/v1/auth/users

# Current user (JWT)
curl -H "Authorization: Bearer $TOKEN" https://groot.localhost/api/v1/auth/me

# Logout (JWT)
curl -H "Authorization: Bearer $TOKEN" -X POST https://groot.localhost/api/v1/auth/logout
```

## Passkeys (WebAuthn)

Passkey flows are interactive (browser mediation), so they're driven from the
client service rather than `curl`. See
[Passkey authentication](../features/passkey-authentication.md) for the
endpoints (`/api/v1/passkey/register/*`, `/login/*`, `/list`).

## App settings (JWT)

```bash
# All settings
curl -H "Authorization: Bearer $TOKEN" https://groot.localhost/api/v1/settings

# A single setting
curl -H "Authorization: Bearer $TOKEN" https://groot.localhost/api/v1/settings/app-name

# Update a setting
curl -H "Authorization: Bearer $TOKEN" -X PUT https://groot.localhost/api/v1/settings/app-name \
  -H "Content-Type: application/json" \
  -d '{"value":"My App"}'

# Delete a setting
curl -H "Authorization: Bearer $TOKEN" -X DELETE https://groot.localhost/api/v1/settings/app-name
```

## Combined workflow

1. Create todos via the snippet above.
2. Queue `todo-summary` to log aggregate stats.
3. Schedule `todo-cleanup` to prune completed todos.
4. Open `/todos` in the client to verify.

> Tip: drop these into an `.http` file (VS Code REST client, JetBrains) for
> faster iteration.
