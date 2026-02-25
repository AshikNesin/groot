import { env } from "@/env";
import { JobName } from "@/core/job/queue";

// Database mode detection
// LOCAL_DB_MODE is set by the dev script: 'docker' or 'pglite'
// Defaults to 'pglite' for safety (single-connection assumptions)
export const LOCAL_DB_MODE = process.env.LOCAL_DB_MODE ?? "pglite";

// Single-connection mode is true for PGlite, false for Docker
export const isSingleConnection = LOCAL_DB_MODE === "pglite";

export const jobConfig = {
	connectionString: env.DATABASE_URL,
	// PGlite only supports 1 connection, so limit concurrency
	concurrency: isSingleConnection ? 1 : env.JOB_CONCURRENCY,
	pollIntervalSeconds: env.JOB_POLL_INTERVAL,
	archiveCompletedAfterSeconds: env.JOB_ARCHIVE_COMPLETED_AFTER_SECONDS,
	deleteArchivedAfterSeconds: env.JOB_DELETE_ARCHIVED_AFTER_SECONDS,
	// Disable state monitor for single-connection mode (it opens another connection)
	monitorStateIntervalSeconds: isSingleConnection
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
