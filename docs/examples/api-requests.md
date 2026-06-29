# API Request Recipes

Copy these curl snippets to exercise the API quickly. Replace `user:pass` with your basic auth credentials.

## Health Check

```bash
curl https://groot.localhost/health
```

## Todos

```bash
# List
curl -u user:pass https://groot.localhost/api/v1/todos

# Create
curl -u user:pass -X POST https://groot.localhost/api/v1/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Draft documentation"}'

# Toggle completion
curl -u user:pass -X PUT https://groot.localhost/api/v1/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# Delete
curl -u user:pass -X DELETE https://groot.localhost/api/v1/todos/1
```

## Jobs

```bash
# Queue todo-summary job
curl -u user:pass -X POST https://groot.localhost/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"jobName":"todo-summary","data":{}}'

# Schedule nightly cleanup
curl -u user:pass -X POST https://groot.localhost/api/v1/jobs/schedule \
  -H "Content-Type: application/json" \
  -d '{"jobName":"todo-cleanup","cron":"0 3 * * *","data":{"daysToKeep":45}}'

# Inspect failed jobs
curl -u user:pass "https://groot.localhost/api/v1/jobs/status/failed?limit=20"

# Retry a specific job
curl -u user:pass -X POST https://groot.localhost/api/v1/jobs/todo-cleanup/job-123/retry

# Delete a job
curl -u user:pass -X DELETE https://groot.localhost/api/v1/jobs/todo-cleanup/job-123
```

## Storage

```bash
# List files (with optional prefix filter)
curl -u user:pass "https://groot.localhost/api/v1/storage/files?prefix=docs/&delimiter=/"

# Upload a single file
curl -u user:pass -F "file=@document.pdf" -F "filePath=docs/document.pdf" \
  https://groot.localhost/api/v1/storage/files/upload

# Upload multiple files (bulk)
curl -u user:pass -F "files=@file1.pdf" -F "files=@file2.pdf" \
  https://groot.localhost/api/v1/storage/files/bulk-upload

# Download a file
curl -u user:pass "https://groot.localhost/api/v1/storage/files/download?filePath=docs/document.pdf" -o document.pdf

# Get file metadata
curl -u user:pass "https://groot.localhost/api/v1/storage/files/metadata?filePath=docs/document.pdf"

# Create a folder
curl -u user:pass -X POST https://groot.localhost/api/v1/storage/folders \
  -H "Content-Type: application/json" \
  -d '{"folderPath":"archive/2024/"}'

# Rename a file
curl -u user:pass -X PUT https://groot.localhost/api/v1/storage/files/rename \
  -H "Content-Type: application/json" \
  -d '{"oldPath":"docs/old.pdf","newPath":"docs/new.pdf"}'

# Delete files
curl -u user:pass -X DELETE https://groot.localhost/api/v1/storage/files \
  -H "Content-Type: application/json" \
  -d '{"filePaths":["docs/document.pdf"]}'
```

## Auth User Management (Admin)

```bash
# Create a new user (requires admin auth key)
curl -X POST https://groot.localhost/api/v1/auth/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-Auth-Key: your-admin-key" \
  -d '{"email":"newuser@example.com","password":"secure-password"}'

# List all users (requires admin auth key)
curl -H "X-Admin-Auth-Key: your-admin-key" \
  https://groot.localhost/api/v1/auth/users

# Login
curl -X POST https://groot.localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get current user (requires JWT from login)
curl -H "Authorization: Bearer your-jwt-token" \
  https://groot.localhost/api/v1/auth/me

# Logout (requires JWT)
curl -X POST -H "Authorization: Bearer your-jwt-token" \
  https://groot.localhost/api/v1/auth/logout
```

## App Settings

```bash
# Get all settings
curl https://groot.localhost/api/v1/settings

# Get specific setting
curl https://groot.localhost/api/v1/settings/app-name

# Update a setting
curl -X PUT https://groot.localhost/api/v1/settings/app-name \
  -H "Content-Type: application/json" \
  -d '{"value":"My App"}'

# Delete a setting
curl -X DELETE https://groot.localhost/api/v1/settings/app-name
```

## Combined Workflow

1. Create todos via the first snippet.
2. Trigger `todo-summary` to log aggregate stats.
3. Run `todo-cleanup` after marking tasks complete.
4. Refresh the React client (`/todos`) to verify updates.

Store these commands in an `.http` file or REST client of your choice for faster iteration.
