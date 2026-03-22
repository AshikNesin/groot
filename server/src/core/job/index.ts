import { PgBoss } from "pg-boss";
import type { Job as BossJob, SendOptions, ScheduleOptions } from "pg-boss";
import dayjs from "dayjs";
import { logger } from "@/core/logger";
import { prisma } from "@/core/database";
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

// Fetch jobs with filters (queue-based, for fetching from a specific queue)
export const fetchJobs = async (
  queueName: string,
  options?: { limit?: number },
): Promise<BossJob[]> => {
  const boss = getBoss();
  return boss.fetch(queueName, options?.limit ?? 50);
};

// Get failed jobs (state-based query)
export const getFailedJobs = async (limit = 50): Promise<BossJob[]> => {
  return prisma.$queryRaw<BossJob[]>`
    SELECT
      id, name, priority, data, state,
      retry_limit as retrylimit,
      retry_count as retrycount,
      retry_delay as retrydelay,
      retry_backoff as retrybackoff,
      start_after as startafter,
      started_on as startedon,
      singleton_key as singletonkey,
      singleton_on as singletonon,
      expire_seconds as expirein,
      created_on as createdon,
      completed_on as completedon,
      keep_until as keepuntil,
      output,
      dead_letter as deadletter,
      policy
    FROM pgboss.job
    WHERE state = 'failed'::pgboss.job_state
    ORDER BY created_on DESC
    LIMIT ${limit}
  `;
};

// Get jobs by state (state-based query with pagination)
export const getJobsByState = async (
  state: string,
  limit = 50,
  offset = 0,
): Promise<{ jobs: BossJob[]; total: number }> => {
  if (!isValidJobState(state)) {
    throw new Error(`Invalid job state: ${state}. Valid states: ${VALID_JOB_STATES.join(", ")}`);
  }

  const [totalResult, jobs] = await Promise.all([
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM pgboss.job WHERE state = ${state}::pgboss.job_state
    `,
    prisma.$queryRaw<BossJob[]>`
      SELECT
        id, name, priority, data, state,
        retry_limit as retrylimit,
        retry_count as retrycount,
        retry_delay as retrydelay,
        retry_backoff as retrybackoff,
        start_after as startafter,
        started_on as startedon,
        singleton_key as singletonkey,
        singleton_on as singletonon,
        expire_seconds as expirein,
        created_on as createdon,
        completed_on as completedon,
        keep_until as keepuntil,
        output,
        dead_letter as deadletter,
        policy
      FROM pgboss.job
      WHERE state = ${state}::pgboss.job_state
      ORDER BY created_on DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
  ]);

  return { jobs, total: Number(totalResult[0]?.count ?? 0) };
};

// Get jobs with filters (supports state, name, date range, pagination)
export const getJobs = async (options: {
  state?: string;
  name?: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}): Promise<{ jobs: BossJob[]; total: number }> => {
  const { state, name, limit = 50, offset = 0, startDate, endDate } = options;

  if (state && !isValidJobState(state)) {
    throw new Error(`Invalid job state: ${state}. Valid states: ${VALID_JOB_STATES.join(", ")}`);
  }

  if (startDate && !dayjs(startDate).isValid()) {
    throw new Error(`Invalid startDate: ${startDate}. Must be a valid date string.`);
  }

  if (endDate && !dayjs(endDate).isValid()) {
    throw new Error(`Invalid endDate: ${endDate}. Must be a valid date string.`);
  }

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (state) {
    conditions.push(`state = $${paramIndex}::pgboss.job_state`);
    params.push(state);
    paramIndex++;
  }
  if (name) {
    conditions.push(`name = $${paramIndex}`);
    params.push(name);
    paramIndex++;
  }
  if (startDate) {
    conditions.push(`created_on >= $${paramIndex}`);
    params.push(dayjs(startDate).toDate());
    paramIndex++;
  }
  if (endDate) {
    conditions.push(`created_on <= $${paramIndex}`);
    params.push(dayjs(endDate).toDate());
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countQuery = `SELECT COUNT(*) as count FROM pgboss.job ${whereClause}`;
  const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(countQuery, ...params);

  const jobsQuery = `
    SELECT
      id, name, priority, data, state,
      retry_limit as retrylimit,
      retry_count as retrycount,
      retry_delay as retrydelay,
      retry_backoff as retrybackoff,
      start_after as startafter,
      started_on as startedon,
      singleton_key as singletonkey,
      singleton_on as singletonon,
      expire_seconds as expirein,
      created_on as createdon,
      completed_on as completedon,
      keep_until as keepuntil,
      output,
      dead_letter as deadletter,
      policy
    FROM pgboss.job
    ${whereClause}
    ORDER BY created_on DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const jobs = await prisma.$queryRawUnsafe<BossJob[]>(jobsQuery, ...params, limit, offset);

  return { jobs, total: Number(totalResult[0]?.count ?? 0) };
};

// Purge jobs by state
export const purgeJobsByState = async (state: string): Promise<number> => {
  if (!isValidJobState(state)) {
    throw new Error(`Invalid job state: ${state}. Valid states: ${VALID_JOB_STATES.join(", ")}`);
  }

  const deleted = await prisma.$executeRaw`
    DELETE FROM pgboss.job WHERE state = ${state}::pgboss.job_state
  `;

  return Number(deleted);
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
