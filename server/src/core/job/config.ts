import { env } from "@/env";
import { JobName } from "@/core/job/queue";

export const jobConfig = {
  connectionString: env.DATABASE_URL,
  concurrency: env.JOB_CONCURRENCY,
  pollIntervalSeconds: env.JOB_POLL_INTERVAL,
  archiveCompletedAfterSeconds: env.JOB_ARCHIVE_COMPLETED_AFTER_SECONDS,
  deleteArchivedAfterSeconds: env.JOB_DELETE_ARCHIVED_AFTER_SECONDS,
  monitorStateIntervalSeconds: env.JOB_MONITOR_STATE_INTERVAL,
} as const;

export const defaultJobOptions = {
  retryLimit: 3,
  retryDelay: 60,
  retryBackoff: true,
  expireInSeconds: 60 * 60 * 12,
} as const;

export const jobOptions: Record<JobName, typeof defaultJobOptions> = {
  [JobName.TODO_CLEANUP]: {
    ...defaultJobOptions,
    retryLimit: 2,
    retryDelay: 120,
  },
  [JobName.TODO_SUMMARY]: {
    ...defaultJobOptions,
    retryLimit: 3,
    retryDelay: 60,
  },
};
