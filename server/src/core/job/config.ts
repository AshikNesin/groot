import { env } from "@/core/env";

export const jobConfig = {
  connectionString: env.DATABASE_URL,
  concurrency: env.JOB_CONCURRENCY,
  pollIntervalSeconds: env.JOB_POLL_INTERVAL,
  archiveCompletedAfterSeconds: env.JOB_ARCHIVE_COMPLETED_AFTER_SECONDS,
  deleteArchivedAfterSeconds: env.JOB_DELETE_ARCHIVED_AFTER_SECONDS,
  monitorStateIntervalSeconds: env.JOB_MONITOR_STATE_INTERVAL,
} as const;

// Default options applied to all jobs unless overridden by the feature.
// Feature-specific options are defined alongside their job handlers.
export const defaultJobOptions = {
  retryLimit: 3,
  retryDelay: 60,
  retryBackoff: true,
  expireInSeconds: 60 * 60 * 12,
} as const;
