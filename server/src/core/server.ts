import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import express, { type Express } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import closeWithGrace from "close-with-grace";
import type { ViteDevServer } from "vite-plus";
import dayjs from "dayjs";
import { Sentry } from "@/core/instrument";
import { env } from "@/core/env";
import { logger } from "@/core/logger";
import corsMiddleware from "@/core/middlewares/cors.middleware";
import { requestLoggerMiddleware } from "@/core/middlewares/requestLogger.middleware";
import {
  errorHandlerMiddleware,
  notFoundHandler,
} from "@/core/middlewares/error-handler.middleware";
import { stopJobQueue } from "@/core/job";

export interface ServerOptions {
  distPath: string;
  clientRoot: string;
}

export interface ServerInstance {
  app: Express;
  httpServer: http.Server;
  viteServer: ViteDevServer | null;
}

let isShuttingDown = false;

export function getIsShuttingDown(): boolean {
  return isShuttingDown;
}

export async function createServer(options: ServerOptions): Promise<ServerInstance> {
  const { distPath, clientRoot } = options;
  const port = env.PORT;
  const isProd = env.NODE_ENV === "production";

  const app = express();
  app.set("trust proxy", 1);

  app.use(requestLoggerMiddleware);
  app.use(corsMiddleware);
  app.use(compression());
  app.use(express.json());
  app.use(cookieParser());

  const httpServer = http.createServer(app);

  let viteServer: ViteDevServer | null = null;

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite-plus");

    let hmrConfig: any = {
      port: port + 1,
    };

    if (process.env.VITE_HMR_URL) {
      hmrConfig = {
        server: httpServer,
        protocol: "wss" as const,
        host: process.env.VITE_HMR_URL,
        clientPort: 443,
      };
    } else if (process.env.PORTLESS_URL) {
      try {
        const url = new URL(process.env.PORTLESS_URL);
        hmrConfig = {
          server: httpServer,
          protocol: url.protocol === "https:" ? "wss" : "ws",
          host: url.hostname,
          clientPort: url.port ? parseInt(url.port, 10) : url.protocol === "https:" ? 443 : 80,
        };
      } catch (e) {
        logger.warn("Failed to parse PORTLESS_URL for HMR config", e);
      }
    }

    viteServer = await createViteServer({
      root: clientRoot,
      configFile: path.resolve(process.cwd(), "vite.config.ts"),
      server: {
        middlewareMode: {
          server: httpServer,
        },
        hmr: hmrConfig,
      },
      appType: "custom",
    });

    app.use(viteServer.middlewares);
    logger.info("Vite dev middleware enabled");
    if (process.env.VITE_HMR_URL) {
      logger.info(`HMR configured for tunnel: wss://${process.env.VITE_HMR_URL}:443`);
    }
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

  // Health endpoints
  app.get("/health", (_req, res) => {
    if (isShuttingDown) {
      res.status(503).json({ status: "shutting_down", timestamp: dayjs().toISOString() });
      return;
    }
    res.json({ status: "ok", timestamp: dayjs().toISOString() });
  });

  app.get("/ready", (_req, res) => {
    if (isShuttingDown) {
      res.status(503).json({ ready: false, reason: "shutting_down" });
      return;
    }
    res.json({ ready: true });
  });

  return { app, httpServer, viteServer };
}

export function setupSpaFallback(
  app: Express,
  viteServer: ViteDevServer | null,
  clientRoot: string,
  distPath: string,
): void {
  const isProd = env.NODE_ENV === "production";

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
}

export function setupErrorHandling(app: Express): void {
  Sentry.setupExpressErrorHandler(app);
  app.use(notFoundHandler);
  app.use(errorHandlerMiddleware);
}

export async function startServer(
  httpServer: http.Server,
  viteServer: ViteDevServer | null,
  onStart?: () => Promise<void>,
): Promise<void> {
  const port = env.PORT;

  httpServer.listen(port, async () => {
    logger.info(`Server is running on http://localhost:${port}`);

    if (onStart) {
      try {
        await onStart();
      } catch (err) {
        logger.error({ err }, "Error during server startup callback");
      }
    }
  });

  closeWithGrace({ delay: 10000 }, async ({ signal, err }) => {
    isShuttingDown = true;
    if (err) {
      logger.error({ err }, "Error triggered shutdown");
    }
    logger.info(`${signal} received. Shutting down gracefully...`);

    // Wait for load balancer to stop sending traffic
    await new Promise((resolve) => setTimeout(resolve, 2000));

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

    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });
}
