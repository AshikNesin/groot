import { Router } from "express";
import todoRoutes from "@/routes/todo.routes";
import jobRoutes from "@/routes/job.routes";

const router = Router();

router.use("/todos", todoRoutes);
router.use("/jobs", jobRoutes);

export const apiRouter = router;
