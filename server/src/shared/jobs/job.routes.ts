import { createRouter } from "@/core/utils/router.utils";
import * as jobController from "@/shared/jobs/job.controller";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "@/core/middlewares/validation.middleware";
import {
  createJobSchema,
  scheduleJobSchema,
  bulkRerunSchema,
  getJobsByStateSchema,
  getJobsSchema,
} from "@/shared/jobs/job.validation";

const router = createRouter();

// Job creation and scheduling
router.post("/", validateBody(createJobSchema), jobController.create);
router.post("/schedule", validateBody(scheduleJobSchema), jobController.schedule);

// Bulk operations
router.post("/bulk-rerun", validateBody(bulkRerunSchema), jobController.bulkRerun);

// Scheduled jobs
router.get("/schedule", jobController.getScheduled);
router.delete("/schedule/:jobName", jobController.cancelScheduled);

// Queue management
router.get("/stats", jobController.getStats);
router.get("/available", jobController.getAvailable);
router.delete("/state/:state", jobController.purgeByState);

// Job status queries
router.get("/status/failed", jobController.getFailed);
router.get("/state/:state", validateParams(getJobsByStateSchema), jobController.getByState);

// Job CRUD
router.get("/", validateQuery(getJobsSchema), jobController.getAll);
router.get("/:queueName/:jobId", jobController.getById);
router.get("/:queueName/:jobId/logs", jobController.getLogs);
router.delete("/:queueName/:jobId", jobController.deleteJobHandler);

// Job actions
router.post("/:queueName/:jobId/retry", jobController.retry);
router.post("/:queueName/:jobId/cancel", jobController.cancel);
router.post("/:queueName/:jobId/resume", jobController.resume);
router.post("/:queueName/:jobId/rerun", jobController.rerun);

export default router;
