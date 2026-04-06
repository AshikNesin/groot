import type { SendOptions, ScheduleOptions } from "pg-boss";
import { logger } from "@/core/logger";
import { defaultJobOptions } from "@/core/job/config";
import { getBoss } from "@/core/job/client";
import type { BulkRerunResult, RerunJobOptions } from "@/core/job/types";

// Queue a job for immediate execution.
export const addJob = async (
  name: string,
  data: unknown,
  options?: SendOptions,
): Promise<string | null> => {
  const boss = getBoss();
  const jobOpts = { ...defaultJobOptions, ...options } as SendOptions;
  const jobId = await boss.send(name, data, jobOpts);
  logger.info({ jobId, name }, "Job queued");
  return jobId;
};

// Schedule a recurring job
export const scheduleJob = async (
  name: string,
  data: unknown,
  cron: string,
  options?: ScheduleOptions,
): Promise<void> => {
  const boss = getBoss();
  await boss.schedule(name, cron, data, options);
  logger.info({ name, cron }, "Job scheduled");
};

// Cancel a scheduled job
export const cancelScheduledJob = async (name: string): Promise<void> => {
  const boss = getBoss();
  await boss.unschedule(name);
};

// Delete a job
export const deleteJob = async (options: { queueName: string; jobId: string }): Promise<void> => {
  const boss = getBoss();
  const deleted = await boss.deleteJob(options.queueName, options.jobId);
  if (!deleted) {
    throw new Error(`Failed to delete job: ${options.queueName}/${options.jobId}`);
  }
};

// Retry a failed job
export const retryJob = async (options: { queueName: string; jobId: string }): Promise<void> => {
  const boss = getBoss();
  const retried = await boss.retry(options.queueName, options.jobId);
  if (!retried) {
    throw new Error("Retry failed");
  }
};

// Cancel a pending job
export const cancelJob = async (options: { queueName: string; jobId: string }): Promise<void> => {
  const boss = getBoss();
  const cancelled = await boss.cancel(options.queueName, options.jobId);
  if (!cancelled) {
    throw new Error("Cancel failed");
  }
};

// Resume a cancelled job
export const resumeJob = async (options: { queueName: string; jobId: string }): Promise<void> => {
  const boss = getBoss();
  const resumed = await boss.resume(options.queueName, options.jobId);
  if (!resumed) {
    throw new Error("Resume failed");
  }
};

// Re-run a job (creates a new job with same data)
export const rerunJob = async (
  options: Omit<RerunJobOptions, "success">,
): Promise<string | null> => {
  const boss = getBoss();
  const job = await boss.getJobById(options.queueName, options.jobId);
  if (!job) {
    throw new Error(`Job not found: ${options.queueName}/${options.jobId}`);
  }
  return boss.send(job.name, job.data, { ...defaultJobOptions } as SendOptions);
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
