import { Router, type Express } from "express";
import { jwtAuthMiddleware } from "@/core/middlewares/jwt-auth.middleware";

// Feature routes
import authRoutes from "@/features/auth/auth.routes";
import passkeyRoutes from "@/features/passkey/passkey.routes";
import todoRoutes from "@/features/todo/todo.routes";
import jobRoutes from "@/features/jobs/job.routes";
import storageRoutes from "@/features/storage/storage.routes";
import publicFileRoutes from "@/features/storage/public-file.routes";
import appSettingsRoutes from "@/features/settings/app-settings.routes";
import aiRoutes from "@/features/ai/ai.routes";

// Feature jobs (import to register handlers)
import "@/features/todo/jobs/todo-cleanup";
import "@/features/todo/jobs/todo-summary";

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
