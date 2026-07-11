import type { Request } from "express";
import * as queue from "./queue";
import * as queries from "./queries";
import { prisma } from "@groot/server/core/database";
import type { GetJobsByStateOptions, GetJobsOptions, RerunJobOptions } from "./types";
import { Boom } from "@groot/server/core/errors";
import { parseLimit } from "@groot/server/core/utils/controller.utils";

/**
 * Queue a job for immediate execution
 */
export async function create(req: Request) {
  const { jobName, data, options } = req.body;
  const jobId = await queue.addJob(jobName, data, options);
  return { jobId, jobName, data };
}

/**
 * Schedule a recurring job
 */
export async function schedule(req: Request) {
  const { jobName, data, cron, options } = req.body;
  await queue.scheduleJob(jobName, data, cron, options);
  return { success: true };
}

/**
 * Bulk re-run jobs
 */
export async function bulkRerun(req: Request) {
  const { jobs } = req.body as { jobs: RerunJobOptions[] };
  return await queue.rerunJobs(jobs);
}

/**
 * Get all scheduled jobs
 */
export async function getScheduled() {
  return await queries.getScheduledJobs();
}

/**
 * Cancel a scheduled job
 */
export async function cancelScheduled(req: Request) {
  const { jobName } = req.params;
  const { key } = req.body ?? {};
  await queue.cancelScheduledJob(jobName, key);
  return { success: true };
}

/**
 * Edit a scheduled job
 */
export async function editScheduled(req: Request) {
  const { jobName } = req.params;
  const { key, cron, data, options } = req.body;
  await queue.editScheduledJob(jobName, key, cron, data, options);
  return { success: true };
}

/**
 * Get queue statistics
 */
export async function getStats() {
  return await queries.getQueueStats();
}

/**
 * Get available job/queue names
 */
export async function getAvailable() {
  const queues = await queries.getAvailableQueues();
  return { jobs: queues };
}

/**
 * Purge jobs by state
 */
export async function purgeByState(req: Request) {
  const { state } = req.params;
  const count = await queries.purgeJobsByState({ state });
  return { count };
}

/**
 * Get failed jobs
 */
export async function getFailed(req: Request) {
  const limit = parseLimit(req.query.limit as string);
  return await queries.getFailedJobs({ limit });
}

/**
 * Get jobs by state
 */
export async function getByState(req: Request) {
  const { state } = req.params;
  const limit = parseLimit(req.query.limit as string);
  const offset = Math.max(0, Number.parseInt(req.query.offset as string, 10) || 0);
  return await queries.getJobsByState({ state, limit, offset } as GetJobsByStateOptions);
}

/**
 * Get all jobs with filters
 */
export async function getAll(req: Request) {
  const query = (req.validated?.query ?? req.query) as GetJobsOptions;
  return await queries.getJobs(query);
}

/**
 * Get job by ID
 */
export async function getById(req: Request) {
  const { queueName, jobId } = req.params;
  const job = await queries.getJobById({ queueName, jobId });
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
  await queue.retryJob({ queueName, jobId });
  return { success: true };
}

/**
 * Cancel a job
 */
export async function cancel(req: Request) {
  const { queueName, jobId } = req.params;
  await queue.cancelJob({ queueName, jobId });
  return { success: true };
}

/**
 * Resume a job
 */
export async function resume(req: Request) {
  const { queueName, jobId } = req.params;
  await queue.resumeJob({ queueName, jobId });
  return { success: true };
}

/**
 * Re-run a job
 */
export async function rerun(req: Request) {
  const { queueName, jobId } = req.params;
  const newJobId = await queue.rerunJob({ queueName, jobId });
  return { newJobId, queueName };
}

/**
 * Delete a job (for handler compatibility)
 */
export async function deleteJobHandler(req: Request) {
  const { queueName, jobId } = req.params;
  await queue.deleteJob({ queueName, jobId });
  return { success: true };
}

/**
 * Get job logs
 */
export async function getLogs(req: Request) {
  const { jobId } = req.params;
  const afterId = req.query.afterId ? Number.parseInt(req.query.afterId as string, 10) : 0;

  const logs = await prisma.jobLog.findMany({
    where: {
      jobId,
      id: {
        gt: afterId,
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  return logs;
}
