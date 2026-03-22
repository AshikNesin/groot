import { PgBoss } from "pg-boss";
import type { Job as BossJob, SendOptions, ScheduleOptions } from "pg-boss";
import { logger } from "@/core/logger";
import { jobConfig, defaultJobOptions, jobOptions } from "@/core/job/config";
import type { JobName, JobDataMap } from "@/core/job/queue";
import { VALID_JOB_STATES, isValidJobState } from "@/core/job/constants";

let bossInstance: PgBoss | null = null;

export const getBoss = (): PgBoss => {
  if (!bossInstance) {
    throw new Error("Job queue not initialized. Call initJobQueue() first.");
  }
  return bossInstance;
};

export const initJobQueue = async (): Promise<void> => {
  if (bossInstance) {
    logger.warn("Job queue already initialized");
    return;
  }

  bossInstance = new PgBoss({
    connectionString: jobConfig.connectionString,
    archiveCompletedAfterSeconds: jobConfig.archiveCompletedAfterSeconds,
    deleteArchivedAfterSeconds: jobConfig.deleteArchivedAfterSeconds,
    monitorStateIntervalSeconds: jobConfig.monitorStateIntervalSeconds,
  });

  bossInstance.on("error", (error) => {
    logger.error({ error }, "PgBoss error");
  });

  bossInstance.on("monitor-states", (states) => {
    logger.debug({ states }, "PgBoss state monitor");
  });

  await bossInstance.start();
  logger.info("Job queue initialized");
};

export const stopJobQueue = async (): Promise<void> => {
  if (!bossInstance) {
    return;
  }

  try {
    const { stopWorkers } = await import("@/core/job/worker");
    await stopWorkers();
    await bossInstance.stop();
    logger.info("Job queue stopped");
  } finally {
    bossInstance = null;
  }
};

// Queue a job for immediate execution
export const addJob = async <T extends JobName>(
  name: T,
  data: JobDataMap[T],
  options?: SendOptions,
): Promise<string | null> => {
  const boss = getBoss();
  const jobOpts = { ...defaultJobOptions, ...jobOptions[name], ...options } as SendOptions;
  const jobId = await boss.send(name, data, jobOpts);
  logger.info({ jobId, name }, "Job queued");
  return jobId;
};

// Schedule a recurring job
export const scheduleJob = async <T extends JobName>(
  name: T,
  data: JobDataMap[T],
  cron: string,
  options?: ScheduleOptions,
): Promise<void> => {
  const boss = getBoss();
  await boss.schedule(name, cron, data, options);
  logger.info({ name, cron }, "Job scheduled");
};

// Cancel a scheduled job
export const cancelScheduledJob = async (name: string): Promise<void> => {
  const boss = getBoss();
  await boss.unschedule(name);
};

// Get all scheduled jobs
export const getScheduledJobs = async (): Promise<Array<{ name: string; cron: string }>> => {
  const boss = getBoss();
  const schedules = await boss.getSchedules();
  return schedules.map((s) => ({ name: s.name, cron: s.cron }));
};

// Get job by ID
export const getJobById = async (queueName: string, jobId: string): Promise<BossJob | null> => {
  const boss = getBoss();
  return boss.getJobById(queueName, jobId);
};

// Get queue statistics
export const getQueueStats = async (): Promise<Record<string, number>> => {
  const boss = getBoss();
  const counts = await boss.getQueueStats();
  return counts.reduce(
    (acc, stat) => {
      acc[stat.queue] = stat.count;
      return acc;
    },
    {} as Record<string, number>,
  );
};

// Fetch jobs with filters
export const fetchJobs = async (
  queueName: string,
  options?: { limit?: number; state?: string },
): Promise<BossJob[]> => {
  if (options?.state && !isValidJobState(options.state)) {
    throw new Error(
      `Invalid job state: ${options.state}. Valid states: ${VALID_JOB_STATES.join(", ")}`,
    );
  }

  const boss = getBoss();
  return boss.fetch(queueName, options?.limit ?? 50, { ...options });
};

// Get failed jobs
export const getFailedJobs = async (limit = 50): Promise<BossJob[]> => {
  const boss = getBoss();
  return boss.fetch("failed", limit, { state: "failed" });
};

// Get jobs by state
export const getJobsByState = async (
  state: string,
  limit = 50,
  offset = 0,
): Promise<{ jobs: BossJob[]; total: number }> => {
  if (!isValidJobState(state)) {
    throw new Error(`Invalid job state: ${state}. Valid states: ${VALID_JOB_STATES.join(", ")}`);
  }

  const boss = getBoss();
  const jobs = await boss.fetch(state, limit + offset);
  const paginatedJobs = jobs.slice(offset, offset + limit);

  return { jobs: paginatedJobs, total: jobs.length };
};

// Get jobs with filters
export const getJobs = async (options: {
  state?: string;
  name?: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}): Promise<{ jobs: BossJob[]; total: number }> => {
  const { state, name, limit = 50 } = options;

  if (state && !isValidJobState(state)) {
    throw new Error(`Invalid job state: ${state}. Valid states: ${VALID_JOB_STATES.join(", ")}`);
  }

  const boss = getBoss();
  const queueName = name ?? state ?? "pgboss.job";
  const jobs = await boss.fetch(queueName, limit, { state });

  return { jobs, total: jobs.length };
};

// Purge jobs by state
export const purgeJobsByState = async (state: string): Promise<number> => {
  if (!isValidJobState(state)) {
    throw new Error(`Invalid job state: ${state}. Valid states: ${VALID_JOB_STATES.join(", ")}`);
  }

  const boss = getBoss();
  return boss.purgeQueue(state);
};

// Delete a job
export const deleteJob = async (queueName: string, jobId: string): Promise<void> => {
  const boss = getBoss();
  const deleted = await boss.deleteJob(queueName, jobId);
  if (!deleted) {
    throw new Error(`Failed to delete job: ${queueName}/${jobId}`);
  }
};

// Retry a failed job
export const retryJob = async (queueName: string, jobId: string): Promise<void> => {
  const boss = getBoss();
  const retried = await boss.retry(queueName, jobId);
  if (!retried) {
    throw new Error("Retry failed");
  }
};

// Cancel a pending job
export const cancelJob = async (queueName: string, jobId: string): Promise<void> => {
  const boss = getBoss();
  const cancelled = await boss.cancel(queueName, jobId);
  if (!cancelled) {
    throw new Error("Cancel failed");
  }
};

// Resume a cancelled job
export const resumeJob = async (queueName: string, jobId: string): Promise<void> => {
  const boss = getBoss();
  const resumed = await boss.resume(queueName, jobId);
  if (!resumed) {
    throw new Error("Resume failed");
  }
};

// Re-run a job (creates a new job with same data)
export const rerunJob = async (queueName: string, jobId: string): Promise<string | null> => {
  const boss = getBoss();
  const job = await boss.getJobById(queueName, jobId);
  if (!job) {
    throw new Error(`Job not found: ${queueName}/${jobId}`);
  }
  const jobOpts = { ...defaultJobOptions, ...jobOptions[job.name as JobName] } as SendOptions;
  return boss.send(job.name, job.data, jobOpts);
};

// Bulk re-run jobs
export const rerunJobs = async (
  jobs: { queueName: string; jobId: string }[],
): Promise<
  Array<{
    queueName: string;
    jobId: string;
    success: boolean;
    newJobId?: string | null;
    error?: string;
  }>
> => {
  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      const newJobId = await rerunJob(job.queueName, job.jobId);
      return { ...job, newJobId };
    }),
  );

  return results.map((result, index) => {
    const originalJob = jobs[index];
    if (result.status === "fulfilled") {
      return {
        queueName: originalJob.queueName,
        jobId: originalJob.jobId,
        success: true,
        newJobId: result.value.newJobId,
      };
    }
    return {
      queueName: originalJob.queueName,
      jobId: originalJob.jobId,
      success: false,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });
};

// Re-export worker functions and types
export { startWorkers, stopWorkers } from "@/core/job/worker";
export { JobName, type JobDataMap } from "@/core/job/queue";
export { JOB_STATES, VALID_JOB_STATES, isValidJobState } from "@/core/job/constants";
