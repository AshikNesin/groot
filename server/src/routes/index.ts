import { Router } from "express";
import todoRoutes from "@/routes/todo.routes";
import jobRoutes from "@/routes/job.routes";
import storageRoutes from "@/routes/storage.routes";
import appSettingsRoutes from "@/routes/app-settings.routes";

const router = Router();

router.use("/todos", todoRoutes);
router.use("/jobs", jobRoutes);
router.use("/storage", storageRoutes);
router.use("/settings", appSettingsRoutes);

export const apiRouter = router;
