import { Router } from "express";
import * as jobController from "./job.controller";
import { adminAuthMiddleware } from "@/core/middlewares/admin-auth.middleware";
import { validate } from "@/core/middlewares/validation.middleware";
import { handle } from "@/core/middlewares/route-handler.middleware";
import {
  createJobSchema,
  scheduleJobSchema,
  bulkRerunSchema,
  getJobsByStateSchema,
  getJobsSchema,
} from "./job.validation";

const router = Router();

// Administrative authentication since jobs are internally visible only
router.use(adminAuthMiddleware);

// Job creation and scheduling
router.post("/", validate(createJobSchema), handle(jobController.create));
router.post("/schedule", validate(scheduleJobSchema), handle(jobController.schedule));

// Bulk operations
router.post("/bulk-rerun", validate(bulkRerunSchema), handle(jobController.bulkRerun));

// Scheduled jobs
router.get("/schedule", handle(jobController.getScheduled));
router.delete("/schedule/:jobName", handle(jobController.cancelScheduled));

// Queue management
router.get("/stats", handle(jobController.getStats));
router.get("/available", handle(jobController.getAvailable));
router.delete("/state/:state", handle(jobController.purgeByState));

// Job status queries
router.get("/status/failed", handle(jobController.getFailed));
router.get("/state/:state", validate(getJobsByStateSchema, "params"), handle(jobController.getByState));

// Job CRUD
router.get("/", validate(getJobsSchema, "query"), handle(jobController.getAll));
router.get("/:queueName/:jobId", handle(jobController.getById));
router.delete("/:queueName/:jobId", handle(jobController.deleteJobHandler));

// Job actions
router.post("/:queueName/:jobId/retry", handle(jobController.retry));
router.post("/:queueName/:jobId/cancel", handle(jobController.cancel));
router.post("/:queueName/:jobId/resume", handle(jobController.resume));
router.post("/:queueName/:jobId/rerun", handle(jobController.rerun));

export default router;
