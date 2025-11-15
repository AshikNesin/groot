import { Router } from "express";
import todoRoutes from "@/routes/todo.routes";
import jobRoutes from "@/routes/job.routes";
import storageRoutes from "@/routes/storage.routes";

const router = Router();

router.use("/todos", todoRoutes);
router.use("/jobs", jobRoutes);
router.use("/storage", storageRoutes);

export const apiRouter = router;
