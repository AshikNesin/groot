import type { NextFunction, Request, Response } from "express";
import type { Logger } from "pino";
import { createRequestLogger, runWithLoggerContext, createTraceContext } from "@/core/logger";

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  runWithLoggerContext(() => {
    // Initialize trace context for this request
    createTraceContext();

    // Attach request-specific logger
    req.logger = createRequestLogger({ req });

    // Track request start time
    req.startTime = Date.now();

    // Log request start
    req.logger.info(`Incoming ${req.method} request to ${req.url}`);

    // Wait for response to finish
    res.on("finish", () => {
      const duration = Date.now() - req.startTime!;
      const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

      req.logger![level](
        {
          statusCode: res.statusCode,
          duration: `${duration}ms`,
        },
        `Request completed with status ${res.statusCode} in ${duration}ms`,
      );
    });

    next();
  });
}

/**
 * Helper to get request logger (with fallback)
 */
export function getRequestLogger(req: Request): Logger {
  return req.logger || createRequestLogger({ req });
}
