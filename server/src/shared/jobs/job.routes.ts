import { createRouter } from "@/core/utils/router.utils";
import * as jobController from "./job.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import {
  createJobSchema,
  scheduleJobSchema,
  bulkRerunSchema,
  getJobsByStateSchema,
  getJobsSchema,
} from "./job.validation";

const router = createRouter();

router.post("/queues", validate(createJobSchema), jobController.create);
router.post("/schedules", validate(scheduleJobSchema), jobController.schedule);
router.post("/rerun", validate(bulkRerunSchema), jobController.bulkRerun);
router.get("/stats", jobController.getStats);
router.get("/state/:state", validate(getJobsByStateSchema, "params"), jobController.getByState);
router.get("/", validate(getJobsSchema, "query"), jobController.getAll);

export default router;
