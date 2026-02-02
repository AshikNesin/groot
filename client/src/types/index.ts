export enum JobName {
  TODO_SUMMARY = "todo-summary",
  TODO_CLEANUP = "todo-cleanup",
}

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
