import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createServer,
  setupSpaFallback,
  setupErrorHandling,
  startServer,
} from "@groot/server/core/server";
import { env } from "@groot/server/core/env";
import { config } from "@groot/server/core/config";
import { logger } from "@groot/server/core/logger";
import { registerRoutes, registerJobHandlers } from "./routes";
import { notificationService } from "@groot/server/shared/notification/notification.service";
import { initJobQueue, startWorkers, stopJobQueue } from "@groot/server/core/job";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientRoot = path.resolve(process.cwd(), "apps/web");
const distPath = path.resolve(__dirname);
const isProd = env.NODE_ENV === "production";

async function main() {
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
      // Initialize job queue after server is listening
      if (config.jobs.enabled) {
        try {
          await initJobQueue();
          await startWorkers();
          logger.info("Job queue initialized and workers started");
        } catch (error) {
          logger.error({ error }, "Failed to initialize job queue");
        }
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
      if (config.jobs.enabled) {
        await stopJobQueue();
      }
    },
  });
}

main().catch((error) => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});
