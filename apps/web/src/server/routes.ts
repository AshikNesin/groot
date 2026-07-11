import { Router, type Express } from "express";
import { jwtAuthMiddleware } from "@groot/server/core/middlewares/jwt-auth.middleware";

// Feature routes
import authRoutes from "@groot/server/shared/auth/auth.routes";
import passkeyRoutes from "@groot/server/shared/passkey/passkey.routes";
import todoRoutes from "./app/todo/todo.routes";
import { jobRoutes } from "@groot/jobs/backend/routes";
import storageRoutes from "@groot/server/shared/storage/storage.routes";
import appSettingsRoutes from "@groot/server/shared/settings/app-settings.routes";

// Feature job registrations
import { registerTodoJobs } from "./app/todo/todo.jobs";

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
