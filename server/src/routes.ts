import { Router, type Express } from "express";
import { jwtAuthMiddleware } from "@/core/middlewares/jwt-auth.middleware";

// Feature routes
import authRoutes from "@/modules/auth/auth.routes";
import passkeyRoutes from "@/modules/passkey/passkey.routes";
import todoRoutes from "@/app/todo/todo.routes";
import jobRoutes from "@/modules/jobs/job.routes";
import storageRoutes from "@/modules/storage/storage.routes";
import publicFileRoutes from "@/modules/storage/public-file.routes";
import appSettingsRoutes from "@/modules/settings/app-settings.routes";
import aiRoutes from "@/modules/ai/ai.routes";

// Feature jobs (import to register handlers)
import "@/app/todo/jobs/todo-cleanup";
import "@/app/todo/jobs/todo-summary";

export function registerRoutes(app: Express): void {
  // Public routes (no auth)
  app.use("/api/v1/public/files", publicFileRoutes);

  // Public auth routes (no auth required)
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/passkey", passkeyRoutes);

  // Protected routes (JWT auth required)
  const protectedRouter = Router();
  protectedRouter.use("/todos", todoRoutes);
  protectedRouter.use("/jobs", jobRoutes);
  protectedRouter.use("/storage", storageRoutes);
  protectedRouter.use("/settings", appSettingsRoutes);
  protectedRouter.use("/ai", aiRoutes);

  app.use("/api/v1", jwtAuthMiddleware, protectedRouter);
}
