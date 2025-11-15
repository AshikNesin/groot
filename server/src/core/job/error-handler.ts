import { Sentry } from "@/core/instrument";
import type { Job } from "pg-boss";
import { logger } from "@/core/logger";

export type JobHandler<T = unknown> = (job: Job<T>) => Promise<void>;

export const withSentryErrorCapture = <T,>(handler: JobHandler<T>, jobName: string): JobHandler<T> => {
  return async (job) => {
    try {
      await handler(job);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      logger.error(
        {
          jobId: job.id,
          jobName,
          error: err.message,
        },
        "Job handler failed",
      );

      Sentry.captureException(err, {
        tags: {
          component: "job_queue",
          jobName,
        },
        extra: {
          jobId: job.id,
        },
      });

      throw err;
    }
  };
};
