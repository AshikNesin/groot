import { Router } from "express";
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
import { ResponseHandler } from "@/core/response-handler";
import { logger } from "@/core/logger";
import { prisma } from "@/core/database";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { jobName, data, options } = req.body ?? {};

    if (!jobName || !data) {
      return ResponseHandler.error(
        res,
        "Missing required fields: jobName and data",
        "JOB_VALIDATION_ERROR",
        400,
      );
    }

    if (!Object.values(JobName).includes(jobName as JobName)) {
      return ResponseHandler.error(res, "Invalid job name", "JOB_NAME_INVALID", 400, {
        availableJobs: Object.values(JobName),
      });
    }

    const jobId = await addJob(jobName as JobName, data, options);
    return ResponseHandler.created(res, { jobId, jobName, data }, "Job queued successfully");
  } catch (error) {
    logger.error({ error }, "Failed to add job");
    return ResponseHandler.error(res, "Failed to add job", "JOB_ENQUEUE_ERROR");
  }
});

router.post("/schedule", async (req, res) => {
  try {
    const { jobName, data, cron, options } = req.body ?? {};

    if (!jobName || !data || !cron) {
      return ResponseHandler.error(
        res,
        "Missing required fields: jobName, data, cron",
        "JOB_SCHEDULE_VALIDATION_ERROR",
        400,
      );
    }

    if (!Object.values(JobName).includes(jobName as JobName)) {
      return ResponseHandler.error(res, "Invalid job name", "JOB_NAME_INVALID", 400, {
        availableJobs: Object.values(JobName),
      });
    }

    await scheduleJob(jobName as JobName, data, cron, options);
    return ResponseHandler.created(res, { jobName, cron, data }, "Job scheduled successfully");
  } catch (error) {
    logger.error({ error }, "Failed to schedule job");
    return ResponseHandler.error(res, "Failed to schedule job", "JOB_SCHEDULE_ERROR");
  }
});

router.post("/:queueName/:jobId/retry", async (req, res) => {
  try {
    const { queueName, jobId } = req.params;
    await retryJob(queueName, jobId);
    return ResponseHandler.success(
      res,
      { queueName, jobId },
      `Job ${queueName}/${jobId} queued for retry`,
    );
  } catch (error) {
    logger.error({ error }, "Failed to retry job");
    return ResponseHandler.error(res, "Failed to retry job", "JOB_RETRY_ERROR");
  }
});

router.post("/:queueName/:jobId/cancel", async (req, res) => {
  try {
    const { queueName, jobId } = req.params;
    await cancelJob(queueName, jobId);
    return ResponseHandler.success(
      res,
      { queueName, jobId },
      `Job ${queueName}/${jobId} cancelled`,
    );
  } catch (error) {
    logger.error({ error }, "Failed to cancel job");
    return ResponseHandler.error(res, "Failed to cancel job", "JOB_CANCEL_ERROR");
  }
});

router.post("/:queueName/:jobId/resume", async (req, res) => {
  try {
    const { queueName, jobId } = req.params;
    await resumeJob(queueName, jobId);
    return ResponseHandler.success(res, { queueName, jobId }, `Job ${queueName}/${jobId} resumed`);
  } catch (error) {
    logger.error({ error }, "Failed to resume job");
    return ResponseHandler.error(res, "Failed to resume job", "JOB_RESUME_ERROR");
  }
});

router.post("/:queueName/:jobId/rerun", async (req, res) => {
  try {
    const { queueName, jobId } = req.params;
    const newJobId = await rerunJob(queueName, jobId);
    return ResponseHandler.success(
      res,
      { originalJobId: jobId, newJobId, queueName },
      `Job ${queueName}/${jobId} re-run`,
    );
  } catch (error) {
    logger.error({ error }, "Failed to re-run job");
    return ResponseHandler.error(res, "Failed to re-run job", "JOB_RERUN_ERROR");
  }
});

router.post("/bulk-rerun", async (req, res) => {
  try {
    const { jobs } = req.body ?? {};

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return ResponseHandler.error(
        res,
        "Missing required field: jobs (array of {queueName, jobId})",
        "JOB_BULK_RERUN_VALIDATION_ERROR",
        400,
      );
    }

    const results = await rerunJobs(jobs);
    const successCount = results.filter((r) => r.success).length;

    return ResponseHandler.success(
      res,
      results,
      `Processed ${jobs.length} re-run requests. Success: ${successCount}`,
    );
  } catch (error) {
    logger.error({ error }, "Failed to bulk re-run jobs");
    return ResponseHandler.error(res, "Failed to bulk re-run jobs", "JOB_BULK_RERUN_ERROR");
  }
});

router.get("/schedule", async (_req, res) => {
  try {
    const jobs = await getScheduledJobs();
    return ResponseHandler.success(res, jobs, "Scheduled jobs retrieved");
  } catch (error) {
    logger.error({ error }, "Failed to get scheduled jobs");
    return ResponseHandler.error(res, "Failed to get scheduled jobs", "JOB_SCHEDULE_LIST_ERROR");
  }
});

router.delete("/schedule/:jobName", async (req, res) => {
  try {
    await cancelScheduledJob(req.params.jobName);
    return ResponseHandler.success(res, { jobName: req.params.jobName }, "Scheduled job cancelled");
  } catch (error) {
    logger.error({ error }, "Failed to cancel scheduled job");
    return ResponseHandler.error(
      res,
      "Failed to cancel scheduled job",
      "JOB_SCHEDULE_CANCEL_ERROR",
    );
  }
});

router.delete("/state/:state", async (req, res) => {
  try {
    const deletedCount = await purgeJobsByState(req.params.state);
    return ResponseHandler.success(res, { state: req.params.state, deletedCount }, "Jobs purged");
  } catch (error) {
    logger.error({ error }, "Failed to purge jobs");
    return ResponseHandler.error(res, "Failed to purge jobs", "JOB_PURGE_ERROR");
  }
});

router.delete("/:queueName/:jobId", async (req, res) => {
  try {
    const { queueName, jobId } = req.params;
    await deleteJob(queueName, jobId);
    return ResponseHandler.success(res, { queueName, jobId }, "Job deleted");
  } catch (error) {
    logger.error({ error }, "Failed to delete job");
    return ResponseHandler.error(res, "Failed to delete job", "JOB_DELETE_ERROR");
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const stats = await getQueueStats();
    return ResponseHandler.success(res, stats, "Queue stats retrieved");
  } catch (error) {
    logger.error({ error }, "Failed to get queue stats");
    return ResponseHandler.error(res, "Failed to get queue stats", "JOB_STATS_ERROR");
  }
});

router.get("/available", (_req, res) => {
  return ResponseHandler.success(res, Object.values(JobName), "Available jobs retrieved");
});

router.get("/status/failed", async (req, res) => {
  try {
    const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;
    const jobs = await getFailedJobs(limit);
    return ResponseHandler.success(res, jobs, "Failed jobs retrieved");
  } catch (error) {
    logger.error({ error }, "Failed to get failed jobs");
    return ResponseHandler.error(res, "Failed to get failed jobs", "JOB_FAILED_LIST_ERROR");
  }
});

router.get("/state/:state", async (req, res) => {
  try {
    const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? Number.parseInt(req.query.offset as string, 10) : 0;
    const result = await getJobsByState(req.params.state, limit, offset);
    return ResponseHandler.success(res, result, "Jobs by state retrieved");
  } catch (error) {
    logger.error({ error }, "Failed to get jobs by state");
    return ResponseHandler.error(res, "Failed to get jobs by state", "JOB_STATE_LIST_ERROR");
  }
});

router.get("/:queueName/:jobId", async (req, res) => {
  try {
    const job = await getJobById(req.params.queueName, req.params.jobId);
    if (!job) {
      return ResponseHandler.error(res, "Job not found", "JOB_NOT_FOUND", 404);
    }
    return ResponseHandler.success(res, job, "Job details retrieved");
  } catch (error) {
    logger.error({ error }, "Failed to get job details");
    return ResponseHandler.error(res, "Failed to get job details", "JOB_DETAIL_ERROR");
  }
});

router.get("/:queueName/:jobId/logs", async (req, res) => {
  try {
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
  } catch (error) {
    logger.error({ error }, "Failed to get job logs");
    return ResponseHandler.error(res, "Failed to get job logs", "JOB_LOGS_ERROR");
  }
});

router.get("/", async (req, res) => {
  try {
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
  } catch (error) {
    logger.error({ error }, "Failed to get jobs");
    return ResponseHandler.error(res, "Failed to get jobs", "JOB_LIST_ERROR");
  }
});

export default router;
