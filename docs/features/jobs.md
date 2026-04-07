# Background Jobs

Pg-boss powers asynchronous work with a modularized, dynamically-registered job system. Jobs are registered at boot time and executed by dedicated workers.

## Architecture

The job system is split into focused modules:

| Module | File | Purpose |
| ------ | ---- | ------- |
| Config | `core/job/config.ts` | Environment-based configuration |
| Client | `core/job/client.ts` | PgBoss singleton instance |
| Queue | `core/job/queue.ts` | Job queueing and scheduling |
| Queries | `core/job/queries.ts` | Job inspection and management |
| Worker | `core/job/worker.ts` | Handler registration and execution |
| Error Handler | `core/job/error-handler.ts` | Sentry capture + logging |

## Job Registration

Jobs are registered dynamically in feature modules, not via static enums:

```typescript
// shared/jobs/job.handlers.ts
import { registerJobHandler, type JobHandler } from "@/core/job";
import type { TodoCleanupPayload } from "./job.types";

export const todoCleanupHandler: JobHandler<TodoCleanupPayload> = async ({ data }) => {
  const { daysToKeep } = data;
  // Cleanup logic...
};

export function registerJobHandlers(): void {
  registerJobHandler("todo-cleanup", todoCleanupHandler);
}
```

Then register in `routes.ts`:

```typescript
import { registerJobHandlers } from "@/shared/jobs/job.handlers";

export function registerJobHandlers(): void {
  registerJobHandlers();
}
```

## Available Jobs

| Job | Handler | Description |
| --- | ------- | ----------- |
| `todo-cleanup` | `jobs/todo-cleanup.ts` | Deletes completed todos older than `daysToKeep` (default 30) |
| `todo-summary` | `jobs/todo-summary.ts` | Logs aggregate todo stats |

Each handler receives `{ jobId, data }` from PgBoss.

## Queueing Jobs

### Via Code

```typescript
import { addJob } from "@/core/job";

await addJob("todo-cleanup", { daysToKeep: 60 });
```

### Via HTTP

```bash
# Queue immediately
curl -H "Authorization: Bearer <token>" \
  -X POST https://groot.localhost/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"jobName":"todo-cleanup","data":{"daysToKeep":60}}'

# Schedule with cron (runs daily at 2am)
curl -H "Authorization: Bearer <token>" \
  -X POST https://groot.localhost/api/v1/jobs/schedule \
  -H "Content-Type: application/json" \
  -d '{"jobName":"todo-cleanup","data":{"daysToKeep":14},"cron":"0 2 * * *"}'

# Retry a failed job
curl -H "Authorization: Bearer <token>" \
  -X POST https://groot.localhost/api/v1/jobs/todo-cleanup/job-123/retry
```

## Job API Endpoints

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/api/v1/jobs` | POST | Queue a new job |
| `/api/v1/jobs/schedule` | POST | Schedule a job with cron |
| `/api/v1/jobs/available` | GET | List valid job names |
| `/api/v1/jobs` | GET | Filter jobs by state/name |
| `/api/v1/jobs/stats` | GET | Aggregated counts per queue/state |
| `/api/v1/jobs/state/failed` | DELETE | Purge all failed jobs |
| `/api/v1/jobs/:name/:id` | GET | Inspect specific job |
| `/api/v1/jobs/:name/:id/retry` | POST | Retry a failed job |
| `/api/v1/jobs/:name/:id/cancel` | POST | Cancel a queued job |

All endpoints require JWT authentication.

## Configuration

Environment variables (see `core/job/config.ts`):

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `ENABLE_JOB_QUEUE` | `true` | Enable/disable job processing |
| `JOB_CONCURRENCY` | `5` | Workers per job |
| `JOB_POLL_INTERVAL` | `2000` | Worker poll interval (ms) |
| `JOB_ARCHIVE_COMPLETED_AFTER_SECONDS` | `86400` | Archive window |
| `JOB_DELETE_ARCHIVED_AFTER_SECONDS` | `604800` | Deletion window |
| `JOB_MONITOR_STATE_INTERVAL` | `30000` | Metrics interval |

## Monitoring

- **Logs**: Pino outputs job lifecycle events (queued, started, errors, completion)
- **Sentry**: Captures exceptions with tags (`component=job_queue`, `jobName`)
- **Database**: Inspect directly via `SELECT * FROM pgboss.job`

## Adding a New Job

1. **Define types** (in feature's validation or types file):

```typescript
export interface MyJobPayload {
  someValue: string;
}
```

2. **Create handler** (in `feature.jobs.ts`):

```typescript
import { registerJobHandler, type JobHandler } from "@/core/job";
import type { MyJobPayload } from "./feature.types";

export const myJobHandler: JobHandler<MyJobPayload> = async ({ data }) => {
  // Implementation
};

export function registerFeatureJobs(): void {
  registerJobHandler("my-job", myJobHandler);
}
```

3. **Register in routes.ts**:

```typescript
import { registerFeatureJobs } from "@/app/feature/feature.jobs";

export function registerJobHandlers(): void {
  registerFeatureJobs();
}
```

4. **Queue the job** via HTTP or code

## Best Practices

- Keep jobs idempotent (safe to retry)
- Keep jobs short-lived (under 5 minutes)
- Split long workflows into chained jobs
- Use structured error handling via Boom
- Log meaningful context for debugging
