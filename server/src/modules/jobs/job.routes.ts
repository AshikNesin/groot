import { Router } from "express";
import { jobController } from "@/modules/jobs/job.controller";

const router = Router();

// Job creation and scheduling
router.post("/", jobController.create);
router.post("/schedule", jobController.schedule);

// Bulk operations
router.post("/bulk-rerun", jobController.bulkRerun);

// Scheduled jobs
router.get("/schedule", jobController.getScheduled);
router.delete("/schedule/:jobName", jobController.cancelScheduled);

// Queue management
router.get("/stats", jobController.getStats);
router.get("/available", jobController.getAvailable);
router.delete("/state/:state", jobController.purgeByState);

// Job status queries
router.get("/status/failed", jobController.getFailed);
router.get("/state/:state", jobController.getByState);

// Job CRUD
router.get("/", jobController.getAll);
router.get("/:queueName/:jobId", jobController.getById);
router.get("/:queueName/:jobId/logs", jobController.getLogs);
router.delete("/:queueName/:jobId", jobController.delete);

// Job actions
router.post("/:queueName/:jobId/retry", jobController.retry);
router.post("/:queueName/:jobId/cancel", jobController.cancel);
router.post("/:queueName/:jobId/resume", jobController.resume);
router.post("/:queueName/:jobId/rerun", jobController.rerun);

export default router;
