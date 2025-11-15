import type { PgBoss, Job, Queue, WorkOptions } from "pg-boss";
import { logger } from "@/core/logger";
import { jobConfig, defaultJobOptions, jobOptions } from "@/core/job/config";
import type { JobName } from "@/core/job/queue";
import { withSentryErrorCapture, type JobHandler } from "@/core/job/error-handler";

let workersStarted = false;
const jobHandlers = new Map<JobName, JobHandler<unknown>>();
const workerIds = new Map<JobName, string[]>();

export const registerJobHandler = <T,>(name: JobName, handler: JobHandler<T>): void => {
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

  await import("@/jobs");

  if (jobHandlers.size === 0) {
    throw new Error("No job handlers registered. Ensure '@/jobs' exports handlers.");
  }

  for (const [name, handler] of jobHandlers.entries()) {
    const options = jobOptions[name] ?? defaultJobOptions;
    const queueOptions: Omit<Queue, "name"> = {
      retryLimit: options.retryLimit,
      retryDelay: options.retryDelay,
      retryBackoff: options.retryBackoff,
      expireInSeconds: options.expireInSeconds,
    };

    try {
      await activeBoss.createQueue(name, queueOptions);
      logger.debug({ queue: name }, "Queue ensured");
    } catch (error) {
      logger.debug({ queue: name, error }, "Queue creation skipped");
    }

    const workOptions: WorkOptions = {
      pollingIntervalSeconds: jobConfig.pollIntervalSeconds,
    };

    for (let i = 0; i < jobConfig.concurrency; i++) {
      const workerId = await activeBoss.work(name, workOptions, async (jobs: Job<unknown>[]) => {
        for (const job of jobs) {
          await handler(job);
        }
      });

      const ids = workerIds.get(name) ?? [];
      ids.push(workerId);
      workerIds.set(name, ids);
    }
  }

  workersStarted = true;
  logger.info({ workerCount: jobHandlers.size }, "Job workers started");
};

export const stopWorkers = async (): Promise<void> => {
  if (!workersStarted) {
    return;
  }

  const boss = (await import("@/core/job/index")).getBoss();

  for (const [name, ids] of workerIds.entries()) {
    for (const id of ids) {
      try {
        await boss.offWork(name, { id, wait: true });
        logger.debug({ jobName: name, workerId: id }, "Worker stopped");
      } catch (error) {
        logger.error({ jobName: name, workerId: id, error }, "Failed to stop worker");
      }
    }
  }

  workerIds.clear();
  workersStarted = false;
};

export const getRegisteredHandlers = (): JobName[] => Array.from(jobHandlers.keys());
