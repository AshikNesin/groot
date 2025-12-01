import type { NextFunction, Request, Response } from "express";
import type { Logger } from "pino";
import { createRequestLogger } from "@/core/logger";
import { createTraceContext } from "@/core/logger/trace-context";

// Extend Express Request type to include logger and timing
declare global {
  namespace Express {
    interface Request {
      logger?: Logger;
      startTime?: number;
    }
  }
}

/**
 * Request logger middleware
 * Attaches a request-specific logger and tracks request timing
 */
export function requestLoggerMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  // Create trace context for this request
  createTraceContext();

  // Attach request-specific logger
  req.logger = createRequestLogger(req);

  // Track request start time
  req.startTime = Date.now();

  // Log incoming request
  req.logger.info(
    {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip || req.headers["x-forwarded-for"],
      userAgent: req.headers["user-agent"],
    },
    "Incoming request",
  );

  next();
}

/**
 * Helper to get request logger (with fallback)
 */
export function getRequestLogger(req: Request): Logger {
  return req.logger || createRequestLogger(req);
}
