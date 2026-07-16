import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createServer,
  setupSpaFallback,
  setupErrorHandling,
  startServer,
} from "@groot/core/server";
import { env } from "@groot/core/env";
import { config } from "@groot/core/config";
import { configureLogger, logger } from "@groot/core/logger";
import { registerRoutes, registerJobHandlers } from "./routes";
import { notificationService } from "@groot/core/notification/notification.service";
import { initJobQueue, stopJobQueue } from "@groot/jobs/server/client";
import { startWorkers } from "@groot/jobs/server/worker";
import { filesPromise } from "@groot/core/storage";
import { isPostgres } from "@groot/core/database/engine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientRoot = path.resolve(process.cwd(), "apps/web");
const distPath = path.resolve(__dirname);
const isProd = env.NODE_ENV === "production";

async function main() {
  // Configure the root logger from app config before any module uses it.
  configureLogger({
    level: config.logging.level,
    service: config.app.name,
    nodeEnv: env.NODE_ENV,
  });

  const { app, httpServer, viteServer } = await createServer({
    distPath,
    clientRoot,
  });

  // Register feature job handlers before routes
  registerJobHandlers();

  // Register feature routes and job handlers
  registerRoutes(app);

  // Setup SPA fallback for non-API routes
  setupSpaFallback(app, viteServer, clientRoot, distPath);

  // Setup error handling (must be last)
  setupErrorHandling(app);

  // Start server
  await startServer(httpServer, viteServer, {
    onStart: async () => {
      // Warm up the storage adapter (resolves the dynamic import in production).
      await filesPromise;

      // Initialize job queue after server is listening.
      // pg-boss is PostgreSQL-only, so the queue is auto-disabled when the
      // database engine is SQLite (the todo job handlers still register, but
      // are never invoked). Set jobs.enabled=false to silence this entirely.
      const jobsEnabled = config.jobs.enabled && isPostgres;
      if (jobsEnabled) {
        try {
          await initJobQueue();
          await startWorkers();
          logger.info("Job queue initialized and workers started");
        } catch (error) {
          logger.error({ error }, "Failed to initialize job queue");
        }
      } else if (!isPostgres) {
        logger.info(
          "Job queue disabled (pg-boss requires PostgreSQL; DATABASE_ENGINE=sqlite). " +
            "Set DATABASE_ENGINE=postgres to enable jobs.",
        );
      } else {
        logger.info("Job queue disabled (set jobs.enabled=true in config.yml to enable)");
      }

      // Send server startup notification in production
      if (isProd) {
        try {
          await notificationService.sendServerStartupNotification(
            config.app.port,
            env.NODE_ENV || "unknown",
          );
        } catch (error) {
          logger.error({ error }, "Failed to send server startup notification");
        }
      }
    },
    onShutdown: async () => {
      if (config.jobs.enabled && isPostgres) {
        await stopJobQueue();
      }
    },
  });
}

main().catch((error) => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});
