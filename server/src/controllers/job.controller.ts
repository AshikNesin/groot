import type { Request, Response } from "express";
import { BaseController } from "@/core/base-controller";
import { ResponseHandler } from "@/core/response-handler";
import { asyncHandler } from "@/core/async-handler";
import { prisma } from "@/core/database";
import { ErrorCode } from "@/core/errors";
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

class JobController extends BaseController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const { jobName, data, options } = req.body ?? {};

    if (!jobName || !data) {
      return ResponseHandler.error(
        res,
        "Missing required fields: jobName and data",
        ErrorCode.JOB_VALIDATION_ERROR.code,
        ErrorCode.JOB_VALIDATION_ERROR.status,
      );
    }

    if (!Object.values(JobName).includes(jobName as JobName)) {
      return ResponseHandler.error(
        res,
        "Invalid job name",
        ErrorCode.JOB_NAME_INVALID.code,
        ErrorCode.JOB_NAME_INVALID.status,
        {
          availableJobs: Object.values(JobName),
        },
      );
    }

    const jobId = await addJob(jobName as JobName, data, options);
    return ResponseHandler.created(res, { jobId, jobName, data }, "Job queued successfully");
  });

  schedule = asyncHandler(async (req: Request, res: Response) => {
    const { jobName, data, cron, options } = req.body ?? {};

    if (!jobName || !data || !cron) {
      return ResponseHandler.error(
        res,
        "Missing required fields: jobName, data, cron",
        ErrorCode.JOB_SCHEDULE_VALIDATION_ERROR.code,
        ErrorCode.JOB_SCHEDULE_VALIDATION_ERROR.status,
      );
    }

    if (!Object.values(JobName).includes(jobName as JobName)) {
      return ResponseHandler.error(
        res,
        "Invalid job name",
        ErrorCode.JOB_NAME_INVALID.code,
        ErrorCode.JOB_NAME_INVALID.status,
        {
          availableJobs: Object.values(JobName),
        },
      );
    }

    await scheduleJob(jobName as JobName, data, cron, options);
    return ResponseHandler.created(res, { jobName, cron, data }, "Job scheduled successfully");
  });

  retry = asyncHandler(async (req: Request, res: Response) => {
    const { queueName, jobId } = req.params;
    await retryJob(queueName, jobId);
    return ResponseHandler.success(
      res,
      { queueName, jobId },
      `Job ${queueName}/${jobId} queued for retry`,
    );
  });

  cancel = asyncHandler(async (req: Request, res: Response) => {
    const { queueName, jobId } = req.params;
    await cancelJob(queueName, jobId);
    return ResponseHandler.success(
      res,
      { queueName, jobId },
      `Job ${queueName}/${jobId} cancelled`,
    );
  });

  resume = asyncHandler(async (req: Request, res: Response) => {
    const { queueName, jobId } = req.params;
    await resumeJob(queueName, jobId);
    return ResponseHandler.success(res, { queueName, jobId }, `Job ${queueName}/${jobId} resumed`);
  });

  rerun = asyncHandler(async (req: Request, res: Response) => {
    const { queueName, jobId } = req.params;
    const newJobId = await rerunJob(queueName, jobId);
    return ResponseHandler.success(
      res,
      { originalJobId: jobId, newJobId, queueName },
      `Job ${queueName}/${jobId} re-run`,
    );
  });

  bulkRerun = asyncHandler(async (req: Request, res: Response) => {
    const { jobs } = req.body ?? {};

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return ResponseHandler.error(
        res,
        "Missing required field: jobs (array of {queueName, jobId})",
        ErrorCode.JOB_BULK_RERUN_VALIDATION_ERROR.code,
        ErrorCode.JOB_BULK_RERUN_VALIDATION_ERROR.status,
      );
    }

    const results = await rerunJobs(jobs);
    const successCount = results.filter((r) => r.success).length;

    return ResponseHandler.success(
      res,
      results,
      `Processed ${jobs.length} re-run requests. Success: ${successCount}`,
    );
  });

  getScheduled = asyncHandler(async (_req: Request, res: Response) => {
    const jobs = await getScheduledJobs();
    return ResponseHandler.success(res, jobs, "Scheduled jobs retrieved");
  });

  cancelScheduled = asyncHandler(async (req: Request, res: Response) => {
    await cancelScheduledJob(req.params.jobName);
    return ResponseHandler.success(res, { jobName: req.params.jobName }, "Scheduled job cancelled");
  });

  purgeByState = asyncHandler(async (req: Request, res: Response) => {
    const deletedCount = await purgeJobsByState(req.params.state);
    return ResponseHandler.success(res, { state: req.params.state, deletedCount }, "Jobs purged");
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const { queueName, jobId } = req.params;
    await deleteJob(queueName, jobId);
    return ResponseHandler.success(res, { queueName, jobId }, "Job deleted");
  });

  getStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await getQueueStats();
    return ResponseHandler.success(res, stats, "Queue stats retrieved");
  });

  getAvailable = asyncHandler(async (_req: Request, res: Response) => {
    return ResponseHandler.success(res, Object.values(JobName), "Available jobs retrieved");
  });

  getFailed = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;
    const jobs = await getFailedJobs(limit);
    return ResponseHandler.success(res, jobs, "Failed jobs retrieved");
  });

  getByState = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? Number.parseInt(req.query.offset as string, 10) : 0;
    const result = await getJobsByState(req.params.state, limit, offset);
    return ResponseHandler.success(res, result, "Jobs by state retrieved");
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const job = await getJobById(req.params.queueName, req.params.jobId);
    if (!job) {
      return ResponseHandler.error(
        res,
        "Job not found",
        ErrorCode.JOB_NOT_FOUND.code,
        ErrorCode.JOB_NOT_FOUND.status,
      );
    }
    return ResponseHandler.success(res, job, "Job details retrieved");
  });

  getLogs = asyncHandler(async (req: Request, res: Response) => {
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
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const state = req.query.state as string | undefined;
    const name = req.query.name as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? Number.parseInt(req.query.offset as string, 10) : 0;
    const jobs = await getJobs({
      state,
      name,
      limit,
      offset,
      startDate,
      endDate,
    });
    return ResponseHandler.success(res, jobs, "Jobs retrieved");
  });
}

export const jobController = new JobController();
