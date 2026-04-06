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

router.post("/queues", validate(createJobSchema), jobController.createJob);
router.post("/schedules", validate(scheduleJobSchema), jobController.scheduleJob);
router.post("/rerun", validate(bulkRerunSchema), jobController.rerunJobs);
router.get("/stats", jobController.getStats);
router.get("/state/:state", validate(getJobsByStateSchema, "params"), jobController.getJobsByState);
router.get("/", validate(getJobsSchema, "query"), jobController.getJobs);

export default router;
