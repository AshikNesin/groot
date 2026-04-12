import { config } from "@/core/config";
import { env } from "@/core/env";

export const jobConfig = {
  connectionString: env.DATABASE_URL,
  concurrency: config.jobs.concurrency,
  pollIntervalSeconds: config.jobs.pollIntervalSeconds,
  archiveCompletedAfterSeconds: config.jobs.archiveCompletedAfterSeconds,
  deleteArchivedAfterSeconds: config.jobs.deleteArchivedAfterSeconds,
  monitorStateIntervalSeconds: config.jobs.monitorStateIntervalSeconds,
} as const;

// Default options applied to all jobs unless overridden by the feature.
// Feature-specific options are defined alongside their job handlers.
export const defaultJobOptions = {
  retryLimit: 3,
  retryDelay: 60,
  retryBackoff: true,
  expireInSeconds: 60 * 60 * 12,
} as const;
