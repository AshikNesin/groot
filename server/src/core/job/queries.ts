import type { Job as BossJob } from "pg-boss";
import dayjs from "dayjs";
import { prisma } from "@/core/database";
import { VALID_JOB_STATES, isValidJobState } from "@/core/job/constants";
import { getBoss } from "@/core/job/client";
import type {
  ScheduledJobInfo,
  FetchJobsOptions,
  GetFailedJobsOptions,
  GetJobsByStateOptions,
  GetJobsOptions,
  JobQueryResponse,
} from "@/core/job/types";

// Get all scheduled jobs
export const getScheduledJobs = async (): Promise<ScheduledJobInfo[]> => {
  const boss = getBoss();
  const schedules = await boss.getSchedules();
  return schedules.map((s) => ({ name: s.name, cron: s.cron }));
};

// Get job by ID
export const getJobById = async (options: {
  queueName: string;
  jobId: string;
}): Promise<BossJob | null> => {
  const boss = getBoss();
  return boss.getJobById(options.queueName, options.jobId);
};

// Get queue statistics
export const getQueueStats = async (): Promise<Record<string, number>> => {
  const boss = getBoss();
  const queues = await boss.getQueues();
  return queues.reduce(
    (acc, q) => {
      acc[q.name] = q.totalCount;
      return acc;
    },
    {} as Record<string, number>,
  );
};

// Fetch jobs with filters (queue-based, for fetching from a specific queue)
export const fetchJobs = async (options: FetchJobsOptions): Promise<BossJob[]> => {
  const boss = getBoss();
  return boss.fetch(options.queueName, options.limit ?? 50);
};

// Get failed jobs (state-based query)
export const getFailedJobs = async (options?: GetFailedJobsOptions): Promise<BossJob[]> => {
  const limit = options?.limit ?? 50;
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
export const getJobsByState = async (options: GetJobsByStateOptions): Promise<JobQueryResponse> => {
  const { state, limit = 50, offset = 0 } = options;

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
export const getJobs = async (options: GetJobsOptions): Promise<JobQueryResponse> => {
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
export const purgeJobsByState = async (options: { state: string }): Promise<number> => {
  const { state } = options;
  if (!isValidJobState(state)) {
    throw new Error(`Invalid job state: ${state}. Valid states: ${VALID_JOB_STATES.join(", ")}`);
  }

  const deleted = await prisma.$executeRaw`
    DELETE FROM pgboss.job WHERE state = ${state}::pgboss.job_state
  `;

  return Number(deleted);
};
