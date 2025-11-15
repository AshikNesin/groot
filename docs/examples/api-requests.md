# API Request Recipes

Copy these curl snippets to exercise the API quickly. Replace `user:pass` with your basic auth credentials.

## Health Check

```bash
curl http://localhost:3000/health
```

## Todos

```bash
# List
curl -u user:pass http://localhost:3000/api/v1/todos

# Create
curl -u user:pass -X POST http://localhost:3000/api/v1/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Draft documentation"}'

# Toggle completion
curl -u user:pass -X PUT http://localhost:3000/api/v1/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# Delete
curl -u user:pass -X DELETE http://localhost:3000/api/v1/todos/1
```

## Jobs

```bash
# Queue todo-summary job
curl -u user:pass -X POST http://localhost:3000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"jobName":"todo-summary","data":{}}'

# Schedule nightly cleanup
curl -u user:pass -X POST http://localhost:3000/api/v1/jobs/schedule \
  -H "Content-Type: application/json" \
  -d '{"jobName":"todo-cleanup","cron":"0 3 * * *","data":{"daysToKeep":45}}'

# Inspect failed jobs
curl -u user:pass "http://localhost:3000/api/v1/jobs/status/failed?limit=20"

# Retry a specific job
curl -u user:pass -X POST http://localhost:3000/api/v1/jobs/todo-cleanup/job-123/retry

# Delete a job
curl -u user:pass -X DELETE http://localhost:3000/api/v1/jobs/todo-cleanup/job-123
```

## Combined Workflow

1. Create todos via the first snippet.
2. Trigger `todo-summary` to log aggregate stats.
3. Run `todo-cleanup` after marking tasks complete.
4. Refresh the React client (`/todos`) to verify updates.

Store these commands in an `.http` file or REST client of your choice for faster iteration.
