import type { PgBoss, WorkOptions } from "pg-boss";
import { logger, createJobLogger } from "@/core/logger";
import { jobConfig } from "@/core/job/config";
import { withSentryErrorCapture, type JobHandler } from "@/core/job/error-handler";

const jobHandlers = new Map<string, JobHandler<unknown>>();
let workersStarted = false;

export const registerJobHandler = <T>(name: string, handler: JobHandler<T>): void => {
  const wrappedHandler = withSentryErrorCapture(handler as JobHandler, name);
  jobHandlers.set(name, wrappedHandler as JobHandler<unknown>);
  logger.debug({ jobName: name }, "Job handler registered");
};

export const startWorkers = async (boss?: PgBoss): Promise<void> => {
  if (workersStarted) {
    logger.warn("Job workers already running");
    return;
  }

  const activeBoss = boss ?? (await import("@/core/job/index")).getBoss();

  if (jobHandlers.size === 0) {
    logger.warn("No job handlers registered. Job queue running without workers.");
    workersStarted = true;
    return;
  }

  const workOptions: WorkOptions = {
    pollingIntervalSeconds: jobConfig.pollIntervalSeconds,
    teamSize: jobConfig.concurrency,
  };

  // Create queues before starting workers (required in pg-boss v12+)
  for (const name of jobHandlers.keys()) {
    await activeBoss.createQueue(name);
  }

  for (const [name, handler] of jobHandlers.entries()) {
    await activeBoss.work(name, workOptions, async (jobs: Parameters<typeof handler>[0][]) => {
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
  }

  workersStarted = true;
  logger.info({ workerCount: jobHandlers.size }, "Job workers started");
};

export const stopWorkers = async (): Promise<void> => {
  if (!workersStarted) {
    return;
  }

  const boss = (await import("@/core/job/index")).getBoss();

  for (const name of jobHandlers.keys()) {
    try {
      await boss.offWork(name);
      logger.debug({ jobName: name }, "Workers stopped");
    } catch (error) {
      logger.error({ jobName: name, error }, "Failed to stop workers");
    }
  }

  workersStarted = false;
};

export const getRegisteredHandlers = (): string[] => Array.from(jobHandlers.keys());
