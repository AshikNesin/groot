import type { Request, Response } from "express";
import { BaseController } from "@/core/base-controller";
import { ResponseHandler } from "@/core/response-handler";
import { prisma } from "@/core/database";
import { Boom, ErrorCodeEnum } from "@/core/errors";
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
  JobName,
} from "@/core/job";

function parsePagination(limit?: string, offset?: string) {
  const parsedLimit = limit ? parseStrictInt(limit) : 50;
  const parsedOffset = offset ? parseStrictInt(offset) : 0;

  if (parsedLimit === null || parsedLimit < 1 || parsedLimit > 1000) {
    throw Boom.badRequest("limit must be an integer between 1 and 1000", null, ErrorCodeEnum.VALIDATION_ERROR);
  }
  if (parsedOffset === null || parsedOffset < 0) {
    throw Boom.badRequest("offset must be a non-negative integer", null, ErrorCodeEnum.VALIDATION_ERROR);
  }

  return { limit: parsedLimit, offset: parsedOffset };
}

function parseStrictInt(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const num = Number.parseInt(value, 10);
  return Number.isSafeInteger(num) ? num : null;
}

class JobController extends BaseController {
  async create(req: Request, res: Response) {
    const { jobName, data, options } = req.body ?? {};

    if (!jobName || !data) {
      throw Boom.badRequest("Missing required fields: jobName and data", null, ErrorCodeEnum.JOB_VALIDATION_ERROR);
    }

    if (!Object.values(JobName).includes(jobName as JobName)) {
      throw Boom.badRequest("Invalid job name", { availableJobs: Object.values(JobName) }, ErrorCodeEnum.JOB_NAME_INVALID);
    }

    const jobId = await addJob(jobName as JobName, data, options);
    return ResponseHandler.created(res, { jobId, jobName, data }, "Job queued successfully");
  }

  async schedule(req: Request, res: Response) {
    const { jobName, data, cron, options } = req.body ?? {};

    if (!jobName || !data || !cron) {
      throw Boom.badRequest("Missing required fields: jobName, data, cron", null, ErrorCodeEnum.JOB_SCHEDULE_VALIDATION_ERROR);
    }

    if (!Object.values(JobName).includes(jobName as JobName)) {
      throw Boom.badRequest("Invalid job name", { availableJobs: Object.values(JobName) }, ErrorCodeEnum.JOB_NAME_INVALID);
    }

    await scheduleJob(jobName as JobName, data, cron, options);
    return ResponseHandler.created(res, { jobName, cron, data }, "Job scheduled successfully");
  }

  async retry(req: Request, res: Response) {
    const { queueName, jobId } = req.params;
    await retryJob(queueName, jobId);
    return ResponseHandler.success(
      res,
      { queueName, jobId },
      `Job ${queueName}/${jobId} queued for retry`,
    );
  }

  async cancel(req: Request, res: Response) {
    const { queueName, jobId } = req.params;
    await cancelJob(queueName, jobId);
    return ResponseHandler.success(
      res,
      { queueName, jobId },
      `Job ${queueName}/${jobId} cancelled`,
    );
  }

  async resume(req: Request, res: Response) {
    const { queueName, jobId } = req.params;
    await resumeJob(queueName, jobId);
    return ResponseHandler.success(res, { queueName, jobId }, `Job ${queueName}/${jobId} resumed`);
  }

  async rerun(req: Request, res: Response) {
    const { queueName, jobId } = req.params;
    const newJobId = await rerunJob(queueName, jobId);
    return ResponseHandler.success(
      res,
      { originalJobId: jobId, newJobId, queueName },
      `Job ${queueName}/${jobId} re-run`,
    );
  }

  async bulkRerun(req: Request, res: Response) {
    const { jobs } = req.body ?? {};

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      throw Boom.badRequest("Missing required field: jobs (array of {queueName, jobId})", null, ErrorCodeEnum.JOB_BULK_RERUN_VALIDATION_ERROR);
    }

    const results = await rerunJobs(jobs);
    const successCount = results.filter((r) => r.success).length;

    return ResponseHandler.success(
      res,
      results,
      `Processed ${jobs.length} re-run requests. Success: ${successCount}`,
    );
  }

  async getScheduled(_req: Request, res: Response) {
    const jobs = await getScheduledJobs();
    return ResponseHandler.success(res, jobs, "Scheduled jobs retrieved");
  }

  async cancelScheduled(req: Request, res: Response) {
    await cancelScheduledJob(req.params.jobName);
    return ResponseHandler.success(res, { jobName: req.params.jobName }, "Scheduled job cancelled");
  }

  async purgeByState(req: Request, res: Response) {
    const deletedCount = await purgeJobsByState(req.params.state);
    return ResponseHandler.success(res, { state: req.params.state, deletedCount }, "Jobs purged");
  }

  async delete(req: Request, res: Response) {
    const { queueName, jobId } = req.params;
    await deleteJob(queueName, jobId);
    return ResponseHandler.success(res, { queueName, jobId }, "Job deleted");
  }

  async getStats(_req: Request, res: Response) {
    const stats = await getQueueStats();
    return ResponseHandler.success(res, stats, "Queue stats retrieved");
  }

  async getAvailable(_req: Request, res: Response) {
    return ResponseHandler.success(res, Object.values(JobName), "Available jobs retrieved");
  }

  async getFailed(req: Request, res: Response) {
    const { limit } = parsePagination(req.query.limit as string | undefined);
    const jobs = await getFailedJobs(limit);
    return ResponseHandler.success(res, jobs, "Failed jobs retrieved");
  }

  async getByState(req: Request, res: Response) {
    const { limit, offset } = parsePagination(
      req.query.limit as string | undefined,
      req.query.offset as string | undefined,
    );
    const result = await getJobsByState(req.params.state, limit, offset);
    return ResponseHandler.success(res, result, "Jobs by state retrieved");
  }

  async getById(req: Request, res: Response) {
    const job = await getJobById(req.params.queueName, req.params.jobId);
    if (!job) {
      throw Boom.notFound("Job not found", null, ErrorCodeEnum.JOB_NOT_FOUND);
    }
    return ResponseHandler.success(res, job, "Job details retrieved");
  }

  async getLogs(req: Request, res: Response) {
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

    return ResponseHandler.success(res, logs, "Job logs retrieved");
  }

  async getAll(req: Request, res: Response) {
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
    return ResponseHandler.success(res, jobs, "Jobs retrieved");
  }
}

export const jobController = new JobController();
