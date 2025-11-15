# Background Jobs

Pg-boss powers asynchronous work for this project. Jobs are enqueued via HTTP endpoints or server-side helpers and executed by workers registered at boot.

## Configuration

- `core/job/config.ts` loads connection + retry settings from environment variables.
- `core/job/index.ts` exports helpers (`addJob`, `scheduleJob`, `getJobs`, etc.) and bootstraps PgBoss via `initJobQueue()`/`startWorkers()` inside `server/src/index.ts`.
- `core/job/worker.ts` manages handler registration, queue creation, concurrency, and graceful shutdown.
- `core/job/error-handler.ts` wraps handlers with Sentry capture + structured logging.

## Available Jobs

Defined in `core/job/queue.ts` and implemented inside `server/src/jobs`.

| Job | Handler | Description |
| --- | --- | --- |
| `todo-cleanup` | `jobs/todo-cleanup.ts` | Deletes completed todos older than `daysToKeep` (default 30) |
| `todo-summary` | `jobs/todo-summary.ts` | Counts total/completed/pending todos and logs aggregates |

Each handler receives `{ jobId, data }` via PgBoss and can access Prisma, Logger, or other services.

## Enqueuing Jobs

### Via Code

```ts
import { addJob, JobName } from "@/core/job";

await addJob(JobName.TODO_CLEANUP, { daysToKeep: 60 });
```

### Via HTTP

Endpoints live under `/api/v1/jobs` (see `server/src/routes/job.routes.ts`). Example requests:

```bash
# Queue immediately
curl -u user:pass -X POST http://localhost:3000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"jobName":"todo-summary","data":{}}'

# Schedule with cron
curl -u user:pass -X POST http://localhost:3000/api/v1/jobs/schedule \
  -H "Content-Type: application/json" \
  -d '{"jobName":"todo-cleanup","data":{"daysToKeep":14},"cron":"0 2 * * *"}'

# Retry a failed job
curl -u user:pass -X POST http://localhost:3000/api/v1/jobs/todo-cleanup/job-123/retry
```

Other key endpoints:

- `GET /api/v1/jobs/available` – Lists valid `JobName` values
- `GET /api/v1/jobs?state=failed&name=todo-cleanup` – Filters job history
- `GET /api/v1/jobs/stats` – Aggregated counts per queue/state
- `DELETE /api/v1/jobs/state/failed` – Purge an entire state
- `GET /api/v1/jobs/todo-cleanup/<id>` – Inspect a specific job record

All routes share consistent error handling thanks to `ResponseHandler` and logger instrumentation.

## Monitoring & Troubleshooting

- `logger` outputs job lifecycle events (queued, started, errors, completion). In dev mode, PgBoss emits `monitor-states` logs as well.
- Sentry captures job exceptions with tags (`component=job_queue`, `jobName`).
- Inspect the database directly: `SELECT * FROM pgboss.job WHERE name = 'todo-cleanup' ORDER BY created_on DESC LIMIT 10;`.

## Extending the Job Catalog

1. Add a new enum + payload type in `core/job/queue.ts`.
2. Create `server/src/jobs/<name>.ts`, implement `registerJobHandler(JobName.NEW_JOB, handler)`.
3. Import the handler in `server/src/jobs/index.ts`.
4. Update `jobOptions` in `core/job/config.ts` if custom retry/timeout behavior is needed.
5. Document the job here and expose HTTP triggers if necessary.

Keep jobs idempotent and short-lived (under five minutes). For longer workflows, split them into smaller jobs or chain queue submissions.
