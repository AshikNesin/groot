import type { PgBoss, WorkOptions } from "pg-boss";
import { logger } from "@groot/server/core/logger";
import { createJobLogger } from "./logger";
import { jobConfig } from "./config";
import { withSentryErrorCapture, type JobHandler } from "./error-handler";
import { getBoss } from "./client";

const jobHandlers = new Map<string, JobHandler<unknown>>();
let workersStarted = false;

export const registerJobHandler = <T>(name: string, handler: JobHandler<T>): void => {
  const wrappedHandler = withSentryErrorCapture(handler as JobHandler, name);
  jobHandlers.set(name, wrappedHandler as JobHandler<unknown>);
  logger.debug({ jobName: name }, "Job handler registered");
};

/**
 * Start workers for every registered handler.
 *
 * CONTRACT: handlers must be registered first via `registerJobHandler()`
 * (typically through a `registerJobHandlers()` call in `routes.ts`, invoked
 * from `index.ts` before `startWorkers()`). With zero handlers this logs an
 * error and returns without starting workers — intended only for enqueue-
 * only processes (e.g. a web dyno whose workers run elsewhere). If this
 * process is supposed to process jobs, an empty registry is a bug: you
 * forgot to register handlers.
 */
export const startWorkers = async (boss?: PgBoss): Promise<void> => {
  if (workersStarted) {
    logger.warn("Job workers already running");
    return;
  }

  if (jobHandlers.size === 0) {
    // Enqueue-only processes legitimately register no handlers, so this is
    // not a hard error — but it is almost always a misconfiguration, so log
    // it loudly and do NOT claim workers are running.
    // Checked before the dynamic import so the no-handler path pays nothing.
    logger.error(
      "No job handlers registered — workers NOT started. Jobs will enqueue " +
        "but never process. If this process should run workers, you forgot to " +
        "call registerJobHandlers() (see docs/features/jobs.md) before " +
        "startWorkers(). Safe to ignore only for enqueue-only processes.",
    );
    return;
  }

  const activeBoss = boss ?? getBoss();

  const workOptions: WorkOptions = {
    pollingIntervalSeconds: jobConfig.pollIntervalSeconds,
    teamSize: jobConfig.concurrency,
  };

  // Create queues before starting workers (required in pg-boss v12+).
  // Per-queue calls are independent — fan them out.
  await Promise.all([...jobHandlers.keys()].map((name) => activeBoss.createQueue(name)));

  const started: string[] = [];
  try {
    await Promise.all(
      [...jobHandlers.entries()].map(async ([name, handler]) => {
        await activeBoss.work(name, workOptions, async (jobs: Parameters<typeof handler>[0][]) => {
          // Process a delivered batch sequentially — handlers may not be
          // concurrency-safe and failure semantics (throw after N) matter.
          for (const job of jobs) {
            const jobLogger = createJobLogger({ jobId: job.id, jobName: name });
            const startTime = Date.now();

            jobLogger.info({ data: job.data }, `Starting job ${name}`);

            try {
              await handler(job);
              const duration = Date.now() - startTime;
              jobLogger.info({ duration: `${duration}ms` }, `Job ${name} completed`);
            } catch (error) {
              const duration = Date.now() - startTime;
              jobLogger.error(
                {
                  duration: `${duration}ms`,
                  error: error instanceof Error ? error.message : String(error),
                },
                `Job ${name} failed`,
              );
              throw error;
            }
          }
        });
        started.push(name);
      }),
    );
  } catch (err) {
    // Partial registration: stop any workers that registered before the failure
    // so they don't keep running while workersStarted stays false.
    await Promise.allSettled(started.map((name) => activeBoss.offWork(name)));
    throw err;
  }

  workersStarted = true;
  logger.info({ workerCount: jobHandlers.size }, "Job workers started");
};

export const stopWorkers = async (): Promise<void> => {
  if (!workersStarted) {
    return;
  }

  const boss = getBoss();

  await Promise.all(
    [...jobHandlers.keys()].map(async (name) => {
      try {
        await boss.offWork(name);
        logger.debug({ jobName: name }, "Workers stopped");
      } catch (error) {
        logger.error({ jobName: name, error }, "Failed to stop workers");
      }
    }),
  );

  workersStarted = false;
};

export const getRegisteredHandlers = (): string[] => Array.from(jobHandlers.keys());
