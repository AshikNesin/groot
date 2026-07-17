import type { SendJobOptions, ScheduleJobOptions } from "./adapter";
import { logger } from "@groot/core/logger";
import { Boom } from "@groot/core/errors";
import { defaultJobOptions } from "./config";
import { getJobQueue } from "./client";
import type { BulkRerunResult, RerunJobOptions } from "./types";

// Queue a job for immediate execution.
export const addJob = async (
  name: string,
  data: unknown,
  options?: SendJobOptions,
): Promise<string | null> => {
  const queue = getJobQueue();
  const jobOpts = { ...defaultJobOptions, ...options };
  const jobId = await queue.send(name, data, jobOpts);
  logger.info({ jobId, name }, "Job queued");
  return jobId;
};

// Schedule a recurring job
export const scheduleJob = async (
  name: string,
  data: unknown,
  cron: string,
  options?: ScheduleJobOptions,
): Promise<void> => {
  const queue = getJobQueue();
  await queue.schedule(name, data, cron, options);
  logger.info({ name, cron }, "Job scheduled");
};

// Cancel a scheduled job
export const cancelScheduledJob = async (name: string, key?: string): Promise<void> => {
  const queue = getJobQueue();
  await queue.unschedule(name, key);
};

// Edit a scheduled job - unschedule old and schedule new
export const editScheduledJob = async (
  name: string,
  key: string | undefined,
  cron: string,
  data: unknown,
  options?: ScheduleJobOptions,
): Promise<void> => {
  if (!key) {
    throw Boom.badRequest("Key is required to edit a scheduled job");
  }
  const queue = getJobQueue();
  await queue.unschedule(name, key);
  await queue.schedule(name, data, cron, options);
  logger.info({ name, key, cron }, "Job schedule updated");
};

// Delete a job
export const deleteJob = async (options: { queueName: string; jobId: string }): Promise<void> => {
  const queue = getJobQueue();
  const deleted = await queue.deleteJob(options.queueName, options.jobId);
  if (!deleted) {
    throw Boom.internal(`Failed to delete job: ${options.queueName}/${options.jobId}`);
  }
};

// Retry a failed job
export const retryJob = async (options: { queueName: string; jobId: string }): Promise<void> => {
  const queue = getJobQueue();
  const retried = await queue.retryJob(options.queueName, options.jobId);
  if (!retried) {
    throw Boom.internal("Retry failed");
  }
};

// Cancel a pending job
export const cancelJob = async (options: { queueName: string; jobId: string }): Promise<void> => {
  const queue = getJobQueue();
  const cancelled = await queue.cancelJob(options.queueName, options.jobId);
  if (!cancelled) {
    throw Boom.internal("Cancel failed");
  }
};

// Resume a cancelled job
export const resumeJob = async (options: { queueName: string; jobId: string }): Promise<void> => {
  const queue = getJobQueue();
  const resumed = await queue.resumeJob(options.queueName, options.jobId);
  if (!resumed) {
    throw Boom.internal("Resume failed");
  }
};

// Re-run a job (creates a new job with same data)
export const rerunJob = async (
  options: Omit<RerunJobOptions, "success">,
): Promise<string | null> => {
  const queue = getJobQueue();
  const job = await queue.getJobById(options.queueName, options.jobId);
  if (!job) {
    throw Boom.notFound(`Job not found: ${options.queueName}/${options.jobId}`);
  }
  return queue.send(job.name, job.data, { ...defaultJobOptions });
};

// Bulk re-run jobs
export const rerunJobs = async (jobs: RerunJobOptions[]): Promise<BulkRerunResult[]> => {
  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      const newJobId = await rerunJob(job);
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
