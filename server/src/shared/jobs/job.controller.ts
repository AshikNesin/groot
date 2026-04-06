import type { Request } from "express";
import { JobSystem } from "@/core/job";
import type { PaginationOptions, GetJobsByStateOptions, GetJobsOptions, RerunJobOptions } from "@/core/job/types";
import { Boom } from "@/core/errors";

/**
 * Queue a job for immediate execution
 */
export async function create(req: Request) {
  const { name, data, options } = req.body;
  const jobId = await JobSystem.queue.addJob(name, data, options);
  return { jobId };
}

/**
 * Schedule a recurring job
 */
export async function schedule(req: Request) {
  const { name, data, cron, options } = req.body;
  await JobSystem.queue.scheduleJob(name, data, cron, options);
  return { success: true };
}

/**
 * Bulk re-run jobs
 */
export async function bulkRerun(req: Request) {
  const { jobs } = req.body as { jobs: RerunJobOptions[] };
  return await JobSystem.queue.rerunJobs(jobs);
}

/**
 * Get all scheduled jobs
 */
export async function getScheduled() {
  return await JobSystem.queries.getScheduledJobs();
}

/**
 * Cancel a scheduled job
 */
export async function cancelScheduled(req: Request) {
  const { jobName } = req.params;
  await JobSystem.queue.cancelScheduledJob(jobName);
  return { success: true };
}

/**
 * Get queue statistics
 */
export async function getStats() {
  return await JobSystem.queries.getQueueStats();
}

/**
 * Fetch jobs (queue-based)
 */
export async function getAvailable(req: Request) {
  const queueName = req.query.queue as string;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  return await JobSystem.queries.fetchJobs({ queueName, limit });
}

/**
 * Purge jobs by state
 */
export async function purgeByState(req: Request) {
  const { state } = req.params;
  const count = await JobSystem.queries.purgeJobsByState({ state });
  return { count };
}

/**
 * Get failed jobs
 */
export async function getFailed(req: Request) {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  return await JobSystem.queries.getFailedJobs({ limit });
}

/**
 * Get jobs by state
 */
export async function getByState(req: Request) {
  const { state } = req.params;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  return await JobSystem.queries.getJobsByState({ state, limit, offset } as GetJobsByStateOptions);
}

/**
 * Get all jobs with filters
 */
export async function getAll(req: Request) {
  const query = (req.validated?.query || req.query) as GetJobsOptions;
  return await JobSystem.queries.getJobs(query);
}

/**
 * Get job by ID
 */
export async function getById(req: Request) {
  const { queueName, jobId } = req.params;
  const job = await JobSystem.queries.getJobById({ queueName, jobId });
  if (!job) {
    throw Boom.notFound("Job not found");
  }
  return job;
}

/**
 * Retry a failed job
 */
export async function retry(req: Request) {
  const { queueName, jobId } = req.params;
  await JobSystem.queue.retryJob({ queueName, jobId });
  return { success: true };
}

/**
 * Cancel a job
 */
export async function cancel(req: Request) {
  const { queueName, jobId } = req.params;
  await JobSystem.queue.cancelJob({ queueName, jobId });
  return { success: true };
}

/**
 * Resume a job
 */
export async function resume(req: Request) {
  const { queueName, jobId } = req.params;
  await JobSystem.queue.resumeJob({ queueName, jobId });
  return { success: true };
}

/**
 * Re-run a job
 */
export async function rerun(req: Request) {
  const { queueName, jobId } = req.params;
  const newJobId = await JobSystem.queue.rerunJob({ queueName, jobId });
  return { newJobId };
}

/**
 * Delete a job (for handler compatibility)
 */
export async function deleteJobHandler(req: Request) {
  const { queueName, jobId } = req.params;
  await JobSystem.queue.deleteJob({ queueName, jobId });
  return { success: true };
}
