import type { NextFunction, Request, Response } from "express";
import type { Logger } from "pino";
import { createRequestLogger, runWithLoggerContext, createTraceContext } from "@/core/logger";

// Vite dev-server internal prefixes
const NOISY_PREFIXES = ["/@fs/", "/@vite/", "/@react-refresh", "/node_modules/", "/src/"];

// File extensions served by Vite as static assets / source modules
const NOISY_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".css",
  ".scss",
  ".sass",
  ".map",
  ".html",
  ".json",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
];

function isNoisyRequest(url: string): boolean {
  // Strip query string (Vite appends ?t=... cache-busters for HMR)
  const path = url.split("?", 2)[0];

  // Match Vite internal prefixes or known asset directories
  if (NOISY_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;

  // Match requests ending in a known file extension
  return NOISY_EXTENSIONS.some((ext) => path.endsWith(ext));
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  runWithLoggerContext(() => {
    // Initialize trace context for this request
    createTraceContext();

    // Attach request-specific logger
    req.logger = createRequestLogger({ req });

    // Track request start time
    req.startTime = Date.now();

    // Skip logging for noisy dev-server requests (e.g. Vite /@fs/.../node_modules)
    const skipLogging = isNoisyRequest(req.url);

    // Log a single line per request, emitted once when the response finishes.
    // Contains full context (method, url, status, duration) so an "incoming"
    // log is redundant.
    if (!skipLogging) {
      res.on("finish", () => {
        const duration = Date.now() - req.startTime!;
        const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

        req.logger![level](
          {
            statusCode: res.statusCode,
            duration: `${duration}ms`,
          },
          `${req.method} ${req.url} → ${res.statusCode} in ${duration}ms`,
        );
      });
    }

    next();
  });
}

/**
 * Helper to get request logger (with fallback)
 */
export function getRequestLogger(req: Request): Logger {
  return req.logger || createRequestLogger({ req });
}
