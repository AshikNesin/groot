import { env } from "@/env";
import { JobName } from "@/core/job/queue";

// Detect local PGlite (from prisma dev) — only supports single connection
export const isLocalPGlite =
  env.DATABASE_URL.includes("sslmode=disable") &&
  env.DATABASE_URL.includes("localhost");

export const jobConfig = {
  connectionString: env.DATABASE_URL,
  // PGlite only supports 1 connection, so limit concurrency
  concurrency: isLocalPGlite ? 1 : env.JOB_CONCURRENCY,
  pollIntervalSeconds: env.JOB_POLL_INTERVAL,
  archiveCompletedAfterSeconds: env.JOB_ARCHIVE_COMPLETED_AFTER_SECONDS,
  deleteArchivedAfterSeconds: env.JOB_DELETE_ARCHIVED_AFTER_SECONDS,
  monitorStateIntervalSeconds: isLocalPGlite
    ? 0
    : env.JOB_MONITOR_STATE_INTERVAL,
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
