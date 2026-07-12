# Background Jobs

Pg-boss powers asynchronous work with a modularized, dynamically-registered job system. Jobs are registered at boot time and executed by dedicated workers.

The entire jobs vertical — backend infrastructure + HTTP admin API + job logger + the dashboard UI + client types/api — lives in the **`@groot/jobs`** package:

- `@groot/jobs/server/*` — server-side (pg-boss queue/worker/queries, HTTP routes, job logger)
- `@groot/jobs/client/*` — client-side (dashboard UI, `jobsApi`, types)

Project-specific job **handlers** (e.g. `todo.jobs.ts`) + bootstrap wiring stay in `apps/web/`.

## Architecture

The backend job system is split into focused modules, flat under `@groot/jobs/server`:

| Module        | File (import path)                 | Purpose                            |
| ------------- | ---------------------------------- | ---------------------------------- |
| Config        | `@groot/jobs/server/config`        | Configuration from `config.yml`    |
| Client        | `@groot/jobs/server/client`        | PgBoss singleton instance          |
| Queue         | `@groot/jobs/server/queue`         | Job queueing and scheduling        |
| Queries       | `@groot/jobs/server/queries`       | Job inspection and management      |
| Worker        | `@groot/jobs/server/worker`        | Handler registration and execution |
| Error Handler | `@groot/jobs/server/error-handler` | Sentry capture + logging           |
| Logger        | `@groot/jobs/server/logger`        | `createJobLogger` (DB-persisted)   |
| Routes        | `@groot/jobs/server/routes`        | HTTP admin API (`/api/v1/jobs`)    |

The public API is also re-exported from the barrel `@groot/jobs/server`.

## Job Registration

Jobs are registered dynamically in feature modules, not via static enums:

```typescript
// apps/web/src/server/api/<feature>/<feature>.jobs.ts
import { registerJobHandler, type JobHandler } from "@groot/jobs/server/worker";
import type { TodoCleanupPayload } from "./todo.types";

export const todoCleanupHandler: JobHandler<TodoCleanupPayload> = async ({ data }) => {
  const { daysToKeep } = data;
  // Cleanup logic...
};

export function registerTodoJobs(): void {
  registerJobHandler("todo-cleanup", todoCleanupHandler);
}
```

Then register in `apps/web/src/server/routes.ts`:

```typescript
import { registerTodoJobs } from "./api/todo/todo.jobs";

export function registerJobHandlers(): void {
  registerTodoJobs();
  // add future feature job registrations here
}
```

`registerJobHandlers()` **must** be called from `index.ts` before
`startWorkers()`. `startWorkers()` with zero handlers logs an error and
starts no workers — intended only for enqueue-only processes.

## Available Jobs

| Job            | Handler (app-owned)     | Description                                                  |
| -------------- | ----------------------- | ------------------------------------------------------------ |
| `todo-cleanup` | `app/todo/todo.jobs.ts` | Deletes completed todos older than `daysToKeep` (default 30) |
| `todo-summary` | `app/todo/todo.jobs.ts` | Logs aggregate todo stats                                    |

Each handler receives `{ id, data }` from PgBoss.

## Queueing Jobs

### Via Code

```typescript
import { addJob } from "@groot/jobs/server/queue";

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

| Endpoint                        | Method | Description                       |
| ------------------------------- | ------ | --------------------------------- |
| `/api/v1/jobs`                  | POST   | Queue a new job                   |
| `/api/v1/jobs/schedule`         | POST   | Schedule a job with cron          |
| `/api/v1/jobs/available`        | GET    | List valid job names              |
| `/api/v1/jobs`                  | GET    | Filter jobs by state/name         |
| `/api/v1/jobs/stats`            | GET    | Aggregated counts per queue/state |
| `/api/v1/jobs/state/failed`     | DELETE | Purge all failed jobs             |
| `/api/v1/jobs/:name/:id`        | GET    | Inspect specific job              |
| `/api/v1/jobs/:name/:id/retry`  | POST   | Retry a failed job                |
| `/api/v1/jobs/:name/:id/cancel` | POST   | Cancel a queued job               |

All endpoints require JWT authentication.

## Configuration

Configured via `config.yml` `jobs:` section (read in `@groot/jobs/server/config`):

| Key                                 | Default   | Description                   |
| ----------------------------------- | --------- | ----------------------------- |
| `jobs.enabled`                      | `true`    | Enable/disable job processing |
| `jobs.concurrency`                  | `5`       | Workers per job               |
| `jobs.pollIntervalSeconds`          | `5`       | Worker poll interval          |
| `jobs.archiveCompletedAfterSeconds` | `604800`  | Archive window (7 days)       |
| `jobs.deleteArchivedAfterSeconds`   | `2592000` | Deletion window (30 days)     |
| `jobs.monitorStateIntervalSeconds`  | `60`      | Metrics interval              |

## Monitoring

- **Logs**: Pino outputs job lifecycle events (queued, started, errors, completion); job logs persist to the `job_logs` table via `createJobLogger`
- **Sentry**: Captures exceptions with tags (`component=job_queue`, `jobName`)
- **Database**: Inspect directly via `SELECT * FROM pgboss.job` (queue) or `job_logs` (persisted logs)

## Dashboard UI

The jobs dashboard (`/jobs`) lives in `@groot/jobs/client`:

- `Jobs` / `JobDetail` — pages (mounted in `apps/web/.../App.tsx`)
- `useJobs` / `useJobDetail` — page hooks (state + data)
- `jobsApi` — client API methods (`@groot/jobs/client/api`)
- `components/` — table, stats, filters, logs, dialogs

The frontend consumes `jobsApi` (built on the shared `api` axios instance from `@groot/shell/lib/api`).

## Adding a New Job

1. **Define types** (in the feature's types file):

```typescript
export interface MyJobPayload {
  someValue: string;
}
```

2. **Create handler** (in `apps/web/src/server/api/<feature>/<feature>.jobs.ts`):

```typescript
import { registerJobHandler, type JobHandler } from "@groot/jobs/server/worker";
import { createJobLogger } from "@groot/jobs/server/logger";
import type { MyJobPayload } from "./feature.types";

export const myJobHandler: JobHandler<MyJobPayload> = async ({ id, data }) => {
  const logger = createJobLogger({ jobId: id, jobName: "my-job" });
  // Implementation
};

export function registerFeatureJobs(): void {
  registerJobHandler("my-job", myJobHandler);
}
```

3. **Register in `apps/web/src/server/routes.ts`**:

```typescript
import { registerFeatureJobs } from "./api/feature/feature.jobs";

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
