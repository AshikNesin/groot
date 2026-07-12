/**
 * A registered job/queue name. Generic string — project-specific job names
 * live with their handlers (e.g. apps/web/src/server/api/todo/todo.jobs.ts).
 */
export type JobName = string;

export enum JobState {
  CREATED = "created",
  RETRY = "retry",
  ACTIVE = "active",
  COMPLETED = "completed",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
  FAILED = "failed",
}

export interface Job {
  id: string;
  name: string;
  data: Record<string, unknown>;
  state: JobState;
  priority: number;
  retrylimit: number;
  retrycount: number;
  retrydelay: number;
  retrybackoff: boolean;
  startafter: string;
  startedon: string | null;
  singletonkey: string | null;
  singletonon: string | null;
  expirein: string;
  createdon: string;
  completedon: string | null;
  keepuntil: string;
  output: Record<string, unknown> | null;
  deadletter: string | null;
}

export interface JobStats {
  active: number;
  created: number;
  retry: number;
  failed: number;
  completed: number;
  expired: number;
  cancelled: number;
}

export interface ScheduledJob {
  name: string;
  cron: string;
  key: string;
  timezone: string | null;
  data: Record<string, unknown>;
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
