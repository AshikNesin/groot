import { logger } from "@groot/core/logger";
import { createJobLogger } from "./logger";
import { jobConfig } from "./config";
import { withSentryErrorCapture, type JobHandler } from "./error-handler";
import { getJobQueue } from "./client";
import type { JobContext } from "./adapter";

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
export const startWorkers = async (): Promise<void> => {
  if (workersStarted) {
    logger.warn("Job workers already running");
    return;
  }

  if (jobHandlers.size === 0) {
    logger.error(
      "No job handlers registered — workers NOT started. Jobs will enqueue " +
        "but never process. If this process should run workers, you forgot to " +
        "call registerJobHandlers() (see docs/features/jobs.md) before " +
        "startWorkers(). Safe to ignore only for enqueue-only processes.",
    );
    return;
  }

  const queue = getJobQueue();

  const workOptions = {
    pollingIntervalSeconds: jobConfig.pollIntervalSeconds,
    batchSize: jobConfig.concurrency,
  };

  // Create queues before starting workers (required by pg-boss v12+; a no-op
  // for honker, which creates queues implicitly on enqueue).
  await Promise.all([...jobHandlers.keys()].map((name) => queue.createQueue(name)));

  const started: string[] = [];
  try {
    await Promise.all(
      [...jobHandlers.entries()].map(async ([name, handler]) => {
        await queue.work(name, workOptions, async (jobs: JobContext[]) => {
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
    await Promise.allSettled(started.map((name) => queue.offWork(name)));
    throw err;
  }

  workersStarted = true;
  logger.info({ workerCount: jobHandlers.size }, "Job workers started");
};

export const stopWorkers = async (): Promise<void> => {
  if (!workersStarted) {
    return;
  }

  const queue = getJobQueue();

  await Promise.all(
    [...jobHandlers.keys()].map(async (name) => {
      try {
        await queue.offWork(name);
        logger.debug({ jobName: name }, "Workers stopped");
      } catch (error) {
        logger.error({ jobName: name, error }, "Failed to stop workers");
      }
    }),
  );

  workersStarted = false;
};

export const getRegisteredHandlers = (): string[] => Array.from(jobHandlers.keys());
