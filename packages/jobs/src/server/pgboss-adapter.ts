/**
 * pg-boss adapter — the PostgreSQL job queue implementation.
 *
 * Wraps `pg-boss` behind the {@link JobQueueAdapter} interface. Selected when
 * `DATABASE_ENGINE=postgres`. The dashboard queries run raw SQL against the
 * `pgboss.job` table (Postgres-only); the column set is normalized into
 * {@link QueueJob} so the rest of the package never touches pg-boss types.
 */
import { PgBoss } from "pg-boss";
import type { Job as BossJob, JobWithMetadata, WorkOptions as BossWorkOptions } from "pg-boss";
import { logger } from "@groot/core/logger";
import { prisma } from "@groot/core/database";
import { jobConfig } from "./config";
import { defaultJobOptions } from "./config";
import { isValidJobState, VALID_JOB_STATES } from "./constants";
import type {
  JobContext,
  JobQueueAdapter,
  QueueJob,
  ScheduleJobOptions,
  SendJobOptions,
  WorkOptions,
} from "./adapter";
import type { GetJobsOptions } from "./types";

// Column set mirrored from the client `Job` type (pg-boss snake_case → camelCase
// without the underscores, to stay byte-compatible with the dashboard).
const JOB_SELECT_COLUMNS = `SELECT
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
  policy`;

function normalizeBossJob(job: JobWithMetadata): QueueJob {
  return {
    id: String(job.id),
    name: job.name,
    data: (job.data ?? {}) as Record<string, unknown>,
    state: job.state,
    priority: job.priority ?? 0,
    retrylimit: job.retryLimit ?? 0,
    retrycount: job.retryCount ?? 0,
    retrydelay: job.retryDelay ?? 0,
    retrybackoff: job.retryBackoff ?? false,
    startafter: job.startAfter ? String(job.startAfter) : "",
    startedon: job.startedOn ? String(job.startedOn) : null,
    singletonkey: job.singletonKey ?? null,
    singletonon: job.singletonOn ? String(job.singletonOn) : null,
    expirein: job.expireInSeconds ? String(job.expireInSeconds) : "",
    createdon: job.createdOn ? String(job.createdOn) : "",
    completedon: job.completedOn ? String(job.completedOn) : null,
    keepuntil: job.keepUntil ? String(job.keepUntil) : "",
    output: (job.output ?? null) as Record<string, unknown> | null,
    deadletter: job.deadLetter ?? null,
  };
}

export class PgBossAdapter implements JobQueueAdapter {
  private boss: PgBoss;

  constructor() {
    this.boss = new PgBoss({
      connectionString: jobConfig.connectionString,
      // Cap the pg-boss pool — it shares the DB with Prisma + KV. 3 handles
      // all internal queries (poll, lock, maintenance) without starving Prisma.
      max: 3,
      // idleTimeoutMillis/connectionTimeoutMillis trigger a pre-existing
      // pg-boss constructor overload TS error (present on main). Cast to the
      // loose options type to keep tsc green without changing runtime.
      ...({ idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 } as object),
    });
    this.boss.on("error", (error) => {
      logger.error({ error }, "PgBoss error");
    });
  }

  async start(): Promise<void> {
    await this.boss.start();
  }

  async stop(): Promise<void> {
    await this.boss.stop();
  }

  async send(name: string, data: unknown, options?: SendJobOptions): Promise<string> {
    const merged = { ...defaultJobOptions, ...options } as SendJobOptions;
    return String(await this.boss.send(name, data as object, merged as object));
  }

  async schedule(
    name: string,
    data: unknown,
    cron: string,
    options?: ScheduleJobOptions,
  ): Promise<void> {
    await this.boss.schedule(name, cron, data as object, options as object);
  }

  async unschedule(name: string, key?: string): Promise<void> {
    await this.boss.unschedule(name, key);
  }

  async getSchedules() {
    const schedules = await this.boss.getSchedules();
    return schedules
      .filter((s) => !s.name.startsWith("__pgboss__"))
      .map((s) => ({
        name: s.name,
        cron: s.cron,
        timezone: s.timezone,
        data: s.data,
        key: s.key,
      }));
  }

  async createQueue(name: string): Promise<void> {
    await this.boss.createQueue(name);
  }

  async work(
    name: string,
    options: WorkOptions,
    handler: (jobs: JobContext[]) => Promise<void>,
  ): Promise<void> {
    const workOptions: BossWorkOptions = {
      pollingIntervalSeconds: options.pollingIntervalSeconds,
      batchSize: options.batchSize,
    };
    await this.boss.work(name, workOptions, async (jobs: BossJob[]) => {
      const batch: JobContext[] = jobs.map((j) => ({
        id: String(j.id),
        name: j.name,
        data: j.data,
      }));
      // pg-boss reclaims/retries when the handler throws.
      await handler(batch);
    });
  }

  async offWork(name: string): Promise<void> {
    await this.boss.offWork(name);
  }

  async getJobById(queueName: string, jobId: string): Promise<QueueJob | null> {
    const result = await prisma.$queryRawUnsafe<JobWithMetadata[]>(
      `${JOB_SELECT_COLUMNS} FROM pgboss.job WHERE id = $1 AND name = $2`,
      jobId,
      queueName,
    );
    return result[0] ? normalizeBossJob(result[0]) : null;
  }

  async getQueueStats(): Promise<Record<string, number>> {
    const results = await prisma.$queryRaw<
      Array<{ state: string; count: bigint }>
    >`SELECT state, COUNT(*) as count FROM pgboss.job GROUP BY state`;
    const stats: Record<string, number> = {};
    for (const state of VALID_JOB_STATES) stats[state] = 0;
    for (const row of results) stats[row.state] = Number(row.count);
    return stats;
  }

  async getAvailableQueues(): Promise<string[]> {
    const queues = await this.boss.getQueues();
    return queues.filter((q) => !q.name.startsWith("__pgboss__")).map((q) => q.name);
  }

  async fetchJobs(queueName: string, limit: number): Promise<QueueJob[]> {
    // boss.fetch returns Job[] (no metadata). Normalize the minimal fields.
    const jobs = await this.boss.fetch(queueName, { batchSize: limit });
    return jobs.map((j) => ({
      id: String(j.id),
      name: j.name,
      data: (j.data ?? {}) as Record<string, unknown>,
      state: "active",
      priority: 0,
      retrylimit: 0,
      retrycount: 0,
      retrydelay: 0,
      retrybackoff: false,
      startafter: "",
      startedon: null,
      singletonkey: null,
      singletonon: null,
      expirein: "",
      createdon: "",
      completedon: null,
      keepuntil: "",
      output: null,
      deadletter: null,
    }));
  }

  async getFailedJobs(limit: number): Promise<QueueJob[]> {
    const query = `
      ${JOB_SELECT_COLUMNS}
      FROM pgboss.job
      WHERE state = 'failed'::pgboss.job_state
      ORDER BY created_on DESC
      LIMIT $1`;
    const rows = await prisma.$queryRawUnsafe<JobWithMetadata[]>(query, limit);
    return rows.map(normalizeBossJob);
  }

  async getJobsByState(
    state: string,
    limit: number,
    offset: number,
  ): Promise<{ jobs: QueueJob[]; total: number }> {
    const [totalResult, rows] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM pgboss.job WHERE state = ${state}::pgboss.job_state
      `,
      prisma.$queryRawUnsafe<JobWithMetadata[]>(
        `
        ${JOB_SELECT_COLUMNS}
        FROM pgboss.job
        WHERE state = $1::pgboss.job_state
        ORDER BY created_on DESC
        LIMIT $2 OFFSET $3`,
        state,
        limit,
        offset,
      ),
    ]);
    return {
      jobs: rows.map(normalizeBossJob),
      total: Number(totalResult[0]?.count ?? 0),
    };
  }

  async getJobs(options: GetJobsOptions): Promise<{ jobs: QueueJob[]; total: number }> {
    const { state, name, limit = 50, offset = 0, startDate, endDate } = options;
    const conditions: string[] = ["name !~ '^__pgboss__'"];
    const params: unknown[] = [];
    let i = 1;
    if (state) {
      conditions.push(`state = $${i}::pgboss.job_state`);
      params.push(state);
      i++;
    }
    if (name) {
      conditions.push(`name = $${i}`);
      params.push(name);
      i++;
    }
    if (startDate) {
      conditions.push(`created_on >= $${i}`);
      params.push(new Date(startDate));
      i++;
    }
    if (endDate) {
      conditions.push(`created_on <= $${i}`);
      params.push(new Date(endDate));
      i++;
    }
    const where = `WHERE ${conditions.join(" AND ")}`;
    const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM pgboss.job ${where}`,
      ...params,
    );
    const rows = await prisma.$queryRawUnsafe<JobWithMetadata[]>(
      `
      ${JOB_SELECT_COLUMNS}
      FROM pgboss.job
      ${where}
      ORDER BY created_on DESC
      LIMIT $${i} OFFSET $${i + 1}`,
      ...params,
      limit,
      offset,
    );
    return {
      jobs: rows.map(normalizeBossJob),
      total: Number(totalResult[0]?.count ?? 0),
    };
  }

  async purgeJobsByState(state: string): Promise<number> {
    const deleted = await prisma.$executeRaw`
      DELETE FROM pgboss.job WHERE state = ${state}::pgboss.job_state
    `;
    return Number(deleted);
  }

  async deleteJob(queueName: string, jobId: string): Promise<boolean> {
    return Boolean(await this.boss.deleteJob(queueName, jobId));
  }

  async retryJob(queueName: string, jobId: string): Promise<boolean> {
    return Boolean(await this.boss.retry(queueName, jobId));
  }

  async cancelJob(queueName: string, jobId: string): Promise<boolean> {
    return Boolean(await this.boss.cancel(queueName, jobId));
  }

  async resumeJob(queueName: string, jobId: string): Promise<boolean> {
    return Boolean(await this.boss.resume(queueName, jobId));
  }
}

// isValidJobState is imported above for parity with the old queries module; it
// is re-exported here so callers that migrated from queries.ts still resolve.
export { isValidJobState };
