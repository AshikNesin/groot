import { Router, type Express } from "express";
import { jwtAuthMiddleware } from "@groot/core/middlewares/jwt-auth.middleware";

// Feature routes
import authRoutes from "@groot/core/auth/auth.routes";
import passkeyRoutes from "@groot/core/passkey/passkey.routes";
import todoRoutes from "./api/todo/todo.routes";
import { jobRoutes } from "@groot/jobs/server/routes";
import storageRoutes from "@groot/core/storage/storage.routes";
import appSettingsRoutes from "@groot/core/settings/app-settings.routes";

// Feature job registrations
import { registerTodoJobs } from "./api/todo/todo.jobs";

/**
 * Register all feature job handlers.
 * Call this before startWorkers() so every queue name is known upfront.
 */
export function registerJobHandlers(): void {
  registerTodoJobs();
  // add future feature job registrations here: registerPostJobs(), etc.
}

export function registerRoutes(app: Express): void {
  // Public auth routes (no auth required)
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/passkey", passkeyRoutes);

  // Protected routes (JWT auth required)
  const protectedRouter = Router();
  protectedRouter.use("/todos", todoRoutes);
  protectedRouter.use("/jobs", jobRoutes);
  protectedRouter.use("/storage", storageRoutes);
  protectedRouter.use("/settings", appSettingsRoutes);

  app.use("/api/v1", jwtAuthMiddleware, protectedRouter);
}
