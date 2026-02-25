import { PgBoss } from "pg-boss";
import type { Job as BossJob } from "pg-boss";
import { logger } from "@/core/logger";
import { prisma } from "@/core/database";
import { jobConfig, jobOptions, defaultJobOptions, isSingleConnection, LOCAL_DB_MODE } from "@/core/job/config";
import type { JobName, JobDataMap } from "@/core/job/queue";
import { startWorkers, stopWorkers } from "@/core/job/worker";
import {
  JOB_STATES,
  VALID_JOB_STATES,
  isValidJobState,
} from "@/core/job/constants";

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
    // Single-connection mode (PGlite) only accepts one connection at a time
    ...(isSingleConnection && { max: 1 }),
  });

  bossInstance.on("error", (error) => {
    logger.error({ error }, "PgBoss error");
  });

  bossInstance.on("monitor-states", (states) => {
    logger.debug({ states }, "PgBoss state monitor");
  });

  await bossInstance.start();
  logger.info(
    isSingleConnection
      ? `Job queue initialized (${LOCAL_DB_MODE} mode — single connection)`
      : "Job queue initialized",
  );
};

export const stopJobQueue = async (): Promise<void> => {
  if (!bossInstance) {
    return;
  }

  try {
    await stopWorkers();
    await bossInstance.stop();
    logger.info("Job queue stopped");
  } finally {
    bossInstance = null;
  }
};

export const addJob = async <T extends JobName>(
  name: T,
  data: JobDataMap[T],
  options?: PgBoss.SendOptions,
): Promise<string | null> => {
  const boss = getBoss();
  const jobSpecificOptions = jobOptions[name] ?? defaultJobOptions;
  const merged = { ...jobSpecificOptions, ...options } as PgBoss.SendOptions;
  const jobId = await boss.send(name, data, merged);
  logger.info({ jobId, name }, "Job queued");
  return jobId;
};

export const scheduleJob = async <T extends JobName>(
  name: T,
  data: JobDataMap[T],
  cron: string,
  options?: PgBoss.ScheduleOptions,
): Promise<void> => {
  const boss = getBoss();
  await boss.schedule(name, cron, data, options);
  logger.info({ name, cron }, "Job scheduled");
};

export const cancelScheduledJob = async (name: string): Promise<void> => {
  const boss = getBoss();
  await boss.unschedule(name);
};

export const getScheduledJobs = async (): Promise<
  Array<{ name: string; cron: string; timezone: string | null; data: unknown }>
> => {
  return prisma.$queryRaw<
    Array<{
      name: string;
      cron: string;
      timezone: string | null;
      data: unknown;
    }>
  >`
    SELECT name, cron, timezone, data
    FROM pgboss.schedule
    ORDER BY name
  `;
};

export const getJobById = async (
  queueName: string,
  jobId: string,
): Promise<BossJob | null> => {
  const boss = getBoss();
  return boss.getJobById(queueName, jobId);
};

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
    WHERE state = 'failed'
    ORDER BY created_on DESC
    LIMIT ${limit}
  `;
};

export const getQueueStats = async (): Promise<Record<string, number>> => {
  const rows = await prisma.$queryRaw<Array<{ state: string; count: bigint }>>`
    SELECT state, COUNT(*) as count
    FROM pgboss.job
    WHERE state IS NOT NULL
    GROUP BY state
  `;

  const stats: Record<string, number> = {
    active: 0,
    created: 0,
    retry: 0,
    failed: 0,
    completed: 0,
    expired: 0,
    cancelled: 0,
  };

  for (const row of rows) {
    stats[row.state] = Number(row.count);
  }

  return stats;
};

export const getJobsByState = async (
  state: string,
  limit = 50,
  offset = 0,
): Promise<{ jobs: BossJob[]; total: number }> => {
  if (!isValidJobState(state)) {
    throw new Error(
      `Invalid job state: ${state}. Valid states are: ${VALID_JOB_STATES.join(", ")}`,
    );
  }

  const totalResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM pgboss.job WHERE state = ${state}::pgboss.job_state
  `;

  const jobs = await prisma.$queryRaw<BossJob[]>`
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
  `;

  return {
    jobs,
    total: Number(totalResult[0]?.count ?? 0),
  };
};

export const getJobs = async ({
  state,
  name,
  limit = 50,
  offset = 0,
  startDate,
  endDate,
}: {
  state?: string;
  name?: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}): Promise<{ jobs: BossJob[]; total: number }> => {
  if (state && !isValidJobState(state)) {
    throw new Error(
      `Invalid job state: ${state}. Valid states are: ${VALID_JOB_STATES.join(", ")}`,
    );
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
    params.push(new Date(startDate));
    paramIndex++;
  }
  if (endDate) {
    conditions.push(`created_on <= $${paramIndex}`);
    params.push(new Date(endDate));
    paramIndex++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countQuery = `SELECT COUNT(*) as count FROM pgboss.job ${whereClause}`;
  const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    countQuery,
    ...params,
  );

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

  const jobs = await prisma.$queryRawUnsafe<BossJob[]>(
    jobsQuery,
    ...params,
    limit,
    offset,
  );

  return { jobs, total: Number(totalResult[0]?.count ?? 0) };
};

export const purgeJobsByState = async (state: string): Promise<number> => {
  if (!isValidJobState(state)) {
    throw new Error(
      `Invalid job state: ${state}. Valid states are: ${VALID_JOB_STATES.join(", ")}`,
    );
  }

  const deleted = await prisma.$executeRaw`
    DELETE FROM pgboss.job WHERE state = ${state}::pgboss.job_state
  `;

  return Number(deleted);
};

export const deleteJob = async (
  queueName: string,
  jobId: string,
): Promise<void> => {
  const boss = getBoss();
  const job = await boss.getJobById(queueName, jobId);
  if (!job) {
    throw new Error(`Job not found: ${queueName}/${jobId}`);
  }
  const deleted = await boss.deleteJob(queueName, jobId);
  if (!deleted) {
    throw new Error(`Failed to delete job: ${queueName}/${jobId}`);
  }
};

export const retryJob = async (
  queueName: string,
  jobId: string,
): Promise<void> => {
  const boss = getBoss();
  const job = await boss.getJobById(queueName, jobId);
  if (!job) {
    throw new Error(`Job not found: ${queueName}/${jobId}`);
  }
  if (job.state !== JOB_STATES.FAILED) {
    throw new Error(`Cannot retry job in '${job.state}' state`);
  }
  const retried = await boss.retry(queueName, jobId);
  if (!retried) {
    throw new Error("Retry failed");
  }
};

export const cancelJob = async (
  queueName: string,
  jobId: string,
): Promise<void> => {
  const boss = getBoss();
  const job = await boss.getJobById(queueName, jobId);
  if (!job) {
    throw new Error(`Job not found: ${queueName}/${jobId}`);
  }
  if (
    ![JOB_STATES.CREATED, JOB_STATES.RETRY, JOB_STATES.ACTIVE].includes(
      job.state as (typeof JOB_STATES)[keyof typeof JOB_STATES],
    )
  ) {
    throw new Error(`Cannot cancel job in '${job.state}' state`);
  }
  const cancelled = await boss.cancel(queueName, jobId);
  if (!cancelled) {
    throw new Error("Cancel failed");
  }
};

export const resumeJob = async (
  queueName: string,
  jobId: string,
): Promise<void> => {
  const boss = getBoss();
  const job = await boss.getJobById(queueName, jobId);
  if (!job) {
    throw new Error(`Job not found: ${queueName}/${jobId}`);
  }
  if (job.state !== JOB_STATES.CANCELLED) {
    throw new Error(`Cannot resume job in '${job.state}' state`);
  }
  const resumed = await boss.resume(queueName, jobId);
  if (!resumed) {
    throw new Error("Resume failed");
  }
};

export const rerunJob = async (
  queueName: string,
  jobId: string,
): Promise<string | null> => {
  const boss = getBoss();
  const job = await boss.getJobById(queueName, jobId);
  if (!job) {
    throw new Error(`Job not found: ${queueName}/${jobId}`);
  }
  const jobSpecificOptions =
    jobOptions[job.name as JobName] ?? defaultJobOptions;
  const newJobId = await boss.send(job.name, job.data, jobSpecificOptions);
  return newJobId;
};

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
      error:
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
    };
  });
};

export { startWorkers, stopWorkers } from "@/core/job/worker";
export { JobName, type JobDataMap } from "@/core/job/queue";
export {
  JOB_STATES,
  VALID_JOB_STATES,
  isValidJobState,
} from "@/core/job/constants";
