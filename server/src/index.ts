import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import type { ViteDevServer } from "vite";
import { Sentry } from "@/core/instrument";
import { env } from "@/env";
import { logger } from "@/core/logger";
import corsMiddleware from "@/middlewares/cors.middleware";
import { jwtAuthMiddleware } from "@/middlewares/jwt-auth.middleware";
import { requestLoggerMiddleware } from "@/middlewares/requestLogger.middleware";
import { errorHandlerMiddleware, notFoundHandler } from "@/middlewares/error-handler.middleware";
import { apiRouter } from "@/routes";
import publicFileRoutes from "@/routes/public-file.routes";
import { initJobQueue, startWorkers, stopJobQueue } from "@/core/job";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = env.PORT;
const isProd = env.NODE_ENV === "production";
const clientRoot = path.resolve(process.cwd(), "client");
const distPath = path.resolve(__dirname);

let viteServer: ViteDevServer | null = null;
app.use(requestLoggerMiddleware);
app.use(corsMiddleware);
app.use(compression());
app.use(express.json());
app.use(cookieParser());

if (!isProd) {
  const { createServer } = await import("vite");

  viteServer = await createServer({
    root: clientRoot,
    configFile: path.resolve(process.cwd(), "vite.config.ts"),
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(viteServer.middlewares);
  logger.info("Vite dev middleware enabled");
} else {
  app.use(
    express.static(distPath, {
      index: false,
      setHeaders: (res) => {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      },
    }),
  );
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Public routes (no basic auth)
app.use("/api/v1/public/files", publicFileRoutes);

// Public auth routes (no basic auth)
import authRoutes from "@/routes/auth.routes";
import passkeyRoutes from "@/routes/passkey.routes";
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/passkey", passkeyRoutes);

// Protected routes (with JWT auth)
app.use("/api/v1", jwtAuthMiddleware, apiRouter);

app.get(/^(?!\/api)(?!\/health).*/, async (req, res, next) => {
  try {
    if (!isProd && viteServer) {
      const url = req.originalUrl;
      const templatePath = path.resolve(clientRoot, "index.html");
      let html = await fs.readFile(templatePath, "utf-8");
      html = await viteServer.transformIndexHtml(url, html);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
      return;
    }

    const html = await fs.readFile(path.join(distPath, "index.html"), "utf-8");
    res.status(200).set({ "Content-Type": "text/html", "Cache-Control": "no-cache" }).end(html);
  } catch (error) {
    next(error);
  }
});

Sentry.setupExpressErrorHandler(app);
app.use(notFoundHandler);
app.use(errorHandlerMiddleware);

const server = app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
  void initializeJobQueue();
});

const initializeJobQueue = async () => {
  try {
    await initJobQueue();
    await startWorkers();
    logger.info("Job queue initialized and workers started");
  } catch (error) {
    logger.error({ error }, "Failed to initialize job queue");
  }
};

const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  try {
    await stopJobQueue();
  } catch (error) {
    logger.error({ error }, "Failed to stop job queue");
  }

  if (viteServer) {
    try {
      await viteServer.close();
      logger.info("Vite dev server closed");
    } catch (error) {
      logger.error({ error }, "Failed to close Vite dev server");
    }
  }

  await new Promise<void>((resolve) => server.close(() => resolve()));
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
