import type { Request, Response } from "express";
import { ResponseHandler } from "@/core/response-handler";
import { prisma } from "@/core/database";
import { Boom, ErrorCode } from "@/core/errors";
import {
  addJob,
  scheduleJob,
  cancelScheduledJob,
  getScheduledJobs,
  getJobById,
  getFailedJobs,
  retryJob,
  cancelJob,
  resumeJob,
  rerunJob,
  rerunJobs,
  getQueueStats,
  getJobsByState,
  getJobs,
  purgeJobsByState,
  deleteJob,
  getRegisteredHandlers,
} from "@/core/job";

function parsePagination(limit?: string, offset?: string) {
  const parsedLimit = limit ? parseStrictInt(limit) : 50;
  const parsedOffset = offset ? parseStrictInt(offset) : 0;

  if (parsedLimit === null || parsedLimit < 1 || parsedLimit > 1000) {
    throw Boom.badRequest(
      "limit must be an integer between 1 and 1000",
      null,
      ErrorCode.VALIDATION_ERROR.code,
    );
  }
  if (parsedOffset === null || parsedOffset < 0) {
    throw Boom.badRequest(
      "offset must be a non-negative integer",
      null,
      ErrorCode.VALIDATION_ERROR.code,
    );
  }

  return { limit: parsedLimit, offset: parsedOffset };
}

function parseStrictInt(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const num = Number.parseInt(value, 10);
  return Number.isSafeInteger(num) ? num : null;
}

export async function create(req: Request, res: Response) {
  const { jobName, data, options } = req.body ?? {};

  if (!jobName || !data) {
    throw Boom.badRequest(
      "Missing required fields: jobName and data",
      null,
      ErrorCode.JOB_VALIDATION_ERROR.code,
    );
  }

  const registeredJobs = getRegisteredHandlers();
  if (!registeredJobs.includes(jobName)) {
    throw Boom.badRequest(
      "Invalid job name",
      { availableJobs: registeredJobs },
      ErrorCode.JOB_NAME_INVALID.code,
    );
  }

  const jobId = await addJob(jobName, data, options);
  ResponseHandler.created(res, { jobId, jobName, data }, "Job queued successfully");
}

export async function schedule(req: Request, res: Response) {
  const { jobName, data, cron, options } = req.body ?? {};

  if (!jobName || !data || !cron) {
    throw Boom.badRequest(
      "Missing required fields: jobName, data, cron",
      null,
      ErrorCode.JOB_SCHEDULE_VALIDATION_ERROR.code,
    );
  }

  const registeredJobs = getRegisteredHandlers();
  if (!registeredJobs.includes(jobName)) {
    throw Boom.badRequest(
      "Invalid job name",
      { availableJobs: registeredJobs },
      ErrorCode.JOB_NAME_INVALID.code,
    );
  }

  await scheduleJob(jobName, data, cron, options);
  ResponseHandler.created(res, { jobName, cron, data }, "Job scheduled successfully");
}

export async function retry(req: Request, res: Response) {
  const { queueName, jobId } = req.params;
  await retryJob({ queueName, jobId });
  ResponseHandler.success(res, { queueName, jobId }, `Job ${queueName}/${jobId} queued for retry`);
}

export async function cancel(req: Request, res: Response) {
  const { queueName, jobId } = req.params;
  await cancelJob({ queueName, jobId });
  ResponseHandler.success(res, { queueName, jobId }, `Job ${queueName}/${jobId} cancelled`);
}

export async function resume(req: Request, res: Response) {
  const { queueName, jobId } = req.params;
  await resumeJob({ queueName, jobId });
  ResponseHandler.success(res, { queueName, jobId }, `Job ${queueName}/${jobId} resumed`);
}

export async function rerun(req: Request, res: Response) {
  const { queueName, jobId } = req.params;
  const newJobId = await rerunJob({ queueName, jobId });
  ResponseHandler.success(
    res,
    { originalJobId: jobId, newJobId, queueName },
    `Job ${queueName}/${jobId} re-run`,
  );
}

export async function bulkRerun(req: Request, res: Response) {
  const { jobs } = req.body ?? {};

  if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
    throw Boom.badRequest(
      "Missing required field: jobs (array of {queueName, jobId})",
      null,
      ErrorCode.JOB_BULK_RERUN_VALIDATION_ERROR.code,
    );
  }

  const results = await rerunJobs(jobs);
  const successCount = results.filter((r) => r.success).length;

  ResponseHandler.success(
    res,
    results,
    `Processed ${jobs.length} re-run requests. Success: ${successCount}`,
  );
}

export async function getScheduled(_req: Request, res: Response) {
  const jobs = await getScheduledJobs();
  ResponseHandler.success(res, jobs, "Scheduled jobs retrieved");
}

export async function cancelScheduled(req: Request, res: Response) {
  await cancelScheduledJob(req.params.jobName);
  ResponseHandler.success(res, { jobName: req.params.jobName }, "Scheduled job cancelled");
}

export async function purgeByState(req: Request, res: Response) {
  const deletedCount = await purgeJobsByState({ state: req.params.state });
  ResponseHandler.success(res, { state: req.params.state, deletedCount }, "Jobs purged");
}

export async function deleteJobHandler(req: Request, res: Response) {
  const { queueName, jobId } = req.params;
  await deleteJob({ queueName, jobId });
  ResponseHandler.success(res, { queueName, jobId }, "Job deleted");
}

export async function getStats(_req: Request, res: Response) {
  const stats = await getQueueStats();
  ResponseHandler.success(res, stats, "Queue stats retrieved");
}

export async function getAvailable(_req: Request, res: Response) {
  ResponseHandler.success(res, getRegisteredHandlers(), "Available jobs retrieved");
}

export async function getFailed(req: Request, res: Response) {
  const { limit } = parsePagination(req.query.limit as string | undefined);
  const jobs = await getFailedJobs({ limit: limit || undefined });
  ResponseHandler.success(res, jobs, "Failed jobs retrieved");
}

export async function getByState(req: Request, res: Response) {
  const { limit, offset } = parsePagination(
    req.query.limit as string | undefined,
    req.query.offset as string | undefined,
  );
  const result = await getJobsByState({
    state: req.params.state,
    limit: limit || undefined,
    offset: offset || undefined,
  });
  ResponseHandler.success(res, result, "Jobs by state retrieved");
}

export async function getById(req: Request, res: Response) {
  const job = await getJobById({ queueName: req.params.queueName, jobId: req.params.jobId });
  if (!job) {
    throw Boom.notFound("Job not found", null, ErrorCode.JOB_NOT_FOUND.code);
  }
  ResponseHandler.success(res, job, "Job details retrieved");
}

export async function getLogs(req: Request, res: Response) {
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

  ResponseHandler.success(res, logs, "Job logs retrieved");
}

export async function getAll(req: Request, res: Response) {
  const state = req.query.state as string | undefined;
  const name = req.query.name as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const { limit, offset } = parsePagination(
    req.query.limit as string | undefined,
    req.query.offset as string | undefined,
  );
  const jobs = await getJobs({
    state,
    name,
    limit,
    offset,
    startDate,
    endDate,
  });
  ResponseHandler.success(res, jobs, "Jobs retrieved");
}
