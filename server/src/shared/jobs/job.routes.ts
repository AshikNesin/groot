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

router.post("/queues", validateBody(createJobSchema), jobController.create);
router.post("/schedules", validateBody(scheduleJobSchema), jobController.schedule);
router.post("/rerun", validateBody(bulkRerunSchema), jobController.bulkRerun);
router.get("/stats", jobController.getStats);
router.get("/state/:state", validateParams(getJobsByStateSchema), jobController.getByState);
router.get("/", validateQuery(getJobsSchema), jobController.getAll);

export default router;
