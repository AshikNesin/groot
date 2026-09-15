/**
 * A registered job/queue name. Generic string — project-specific job names
 * live with their handlers (e.g. apps/web/src/server/api/todo/todo.jobs.ts).
 */
export type JobName = string;

// The dashboard Job shape is defined once, by the server adapter contract
// (QueueJob). Type-only import — erased in the client bundle, no runtime coupling.
export type { QueueJob as Job, ScheduledJobInfo as ScheduledJob } from "../../server/adapter";

export interface JobStats {
  active: number;
  created: number;
  retry: number;
  failed: number;
  completed: number;
  expired: number;
  cancelled: number;
}

export interface JobLog {
  id: number;
  jobId: string;
  jobName: string | null;
  level: string;
  message: string;
  data: unknown;
  timestamp: string;
}
