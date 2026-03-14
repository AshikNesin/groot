import { Router } from "express";
import todoRoutes from "@/routes/todo.routes";
import jobRoutes from "@/routes/job.routes";
import storageRoutes from "@/routes/storage.routes";
import appSettingsRoutes from "@/routes/app-settings.routes";
import aiRoutes from "@/routes/ai.routes";

const router = Router();

router.use("/todos", todoRoutes);
router.use("/jobs", jobRoutes);
router.use("/storage", storageRoutes);
router.use("/settings", appSettingsRoutes);
router.use("/ai", aiRoutes);

export const apiRouter = router;
