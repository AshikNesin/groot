import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, setupSpaFallback, setupErrorHandling, startServer } from "@/core/server";
import { env } from "@/core/env";
import { logger } from "@/core/logger";
import { registerRoutes } from "@/routes";
import { notificationService } from "@/shared/notification/notification.service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientRoot = path.resolve(process.cwd(), "client");
const distPath = path.resolve(__dirname);
const isProd = env.NODE_ENV === "production";

async function main() {
  const { app, httpServer, viteServer } = await createServer({
    distPath,
    clientRoot,
  });

  // Register feature routes
  registerRoutes(app);

  // Setup SPA fallback for non-API routes
  setupSpaFallback(app, viteServer, clientRoot, distPath);

  // Setup error handling (must be last)
  setupErrorHandling(app);

  // Start server with optional startup callback
  await startServer(httpServer, viteServer, async () => {
    // Send server startup notification in production
    if (isProd) {
      try {
        await notificationService.sendServerStartupNotification(
          env.PORT,
          env.NODE_ENV || "unknown",
        );
      } catch (error) {
        logger.error({ error }, "Failed to send server startup notification");
      }
    }
  });
}

main().catch((error) => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});

// Re-export for backwards compatibility
export { getIsShuttingDown } from "@/core/server";
