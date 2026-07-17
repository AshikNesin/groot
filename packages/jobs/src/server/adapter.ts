/**
 * Job queue adapter interface.
 *
 * The jobs package originally bound itself directly to pg-boss (a
 * PostgreSQL-only queue). To support SQLite, the pg-boss-specific surface is
 * hidden behind this interface. Two implementations ship:
 *
 *   - {@link PgBossAdapter}  — wraps pg-boss (PostgreSQL). Selected when
 *     `DATABASE_ENGINE=postgres`.
 *   - {@link HonkerAdapter}  — wraps `@russellthehippo/honker-node`, a durable
 *     SQLite-backed queue (SELECTed when `DATABASE_ENGINE=sqlite`).
 *
 * Both return jobs in the normalized {@link QueueJob} shape, which matches the
 * `Job` type the client dashboard already consumes (pg-boss column names
 * lower-cased and underscore-stripped). Feature code and the dashboard thus
 * stay engine-agnostic.
 */

import type { GetJobsOptions } from "./types";

/** A job as delivered to a handler. The minimal context handlers need. */
export interface JobContext<T = unknown> {
  id: string;
  name: string;
  data: T;
}

/** Options for enqueueing a job. Engine-agnostic superset of pg-boss/honker. */
export interface SendJobOptions {
  /** Max retry attempts after the initial try. */
  retryLimit?: number;
  /** Base delay between retries, in seconds. */
  retryDelay?: number;
  /** Exponential backoff between retries (pg-boss only; ignored by honker). */
  retryBackoff?: boolean;
  /** Seconds before an unstarted job expires. */
  expireInSeconds?: number;
  /** Job priority (higher runs first). */
  priority?: number;
  /** Seconds to delay the first run. */
  delaySeconds?: number;
}

/** Options for scheduling a recurring job. */
export interface ScheduleJobOptions {
  /** Singleton key — prevents duplicate concurrent schedules (pg-boss). */
  key?: string;
}

/** Options controlling worker polling/concurrency. */
export interface WorkOptions {
  /** Seconds between polls (pg-boss). Honker is push-driven; used as idle fallback. */
  pollingIntervalSeconds?: number;
  /** Max jobs claimed per batch. */
  batchSize?: number;
}

/** A normalized job row, matching the client `Job` type. */
export interface QueueJob {
  id: string;
  name: string;
  data: Record<string, unknown>;
  state: string;
  priority: number;
  retrylimit: number;
  retrycount: number;
  retrydelay: number;
  retrybackoff: boolean;
  startafter: string;
  startedon: string | null;
  singletonkey: string | null;
  singletonon: string | null;
  expirein: string;
  createdon: string;
  completedon: string | null;
  keepuntil: string;
  output: Record<string, unknown> | null;
  deadletter: string | null;
}

export interface ScheduledJobInfo {
  name: string;
  cron: string;
  timezone?: string;
  data?: unknown;
  key?: string;
}

export interface JobQueueAdapter {
  /** Start the queue (create schema, connect). */
  start(): Promise<void>;
  /** Stop workers + release resources. */
  stop(): Promise<void>;

  // --- Enqueue / schedule ---
  send(name: string, data: unknown, options?: SendJobOptions): Promise<string>;
  schedule(name: string, data: unknown, cron: string, options?: ScheduleJobOptions): Promise<void>;
  unschedule(name: string, key?: string): Promise<void>;
  getSchedules(): Promise<ScheduledJobInfo[]>;

  // --- Workers ---
  /** Create a queue/queue-name (required by pg-boss v12+ before work). */
  createQueue(name: string): Promise<void>;
  /**
   * Register a handler for a queue. The adapter claims jobs, delivers them as
   * normalized {@link JobContext} batch, and owns ack/retry: resolving acks;
   * rejecting triggers retry (or dead-letters once attempts are exhausted).
   */
  work(
    name: string,
    options: WorkOptions,
    handler: (jobs: JobContext[]) => Promise<void>,
  ): Promise<void>;
  offWork(name: string): Promise<void>;

  // --- Queries (dashboard) ---
  getJobById(queueName: string, jobId: string): Promise<QueueJob | null>;
  getQueueStats(): Promise<Record<string, number>>;
  getAvailableQueues(): Promise<string[]>;
  fetchJobs(queueName: string, limit: number): Promise<QueueJob[]>;
  getFailedJobs(limit: number): Promise<QueueJob[]>;
  getJobsByState(
    state: string,
    limit: number,
    offset: number,
  ): Promise<{ jobs: QueueJob[]; total: number }>;
  getJobs(options: GetJobsOptions): Promise<{ jobs: QueueJob[]; total: number }>;
  purgeJobsByState(state: string): Promise<number>;

  // --- Job actions ---
  deleteJob(queueName: string, jobId: string): Promise<boolean>;
  retryJob(queueName: string, jobId: string): Promise<boolean>;
  cancelJob(queueName: string, jobId: string): Promise<boolean>;
  resumeJob(queueName: string, jobId: string): Promise<boolean>;
}
