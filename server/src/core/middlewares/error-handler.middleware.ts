import type { NextFunction, Request, Response } from "express";
import { Boom } from "@/core/errors";
import { Sentry } from "@/core/instrument";
import { logBusinessEvent } from "@/core/logger";
import { getRequestLogger } from "@/core/middlewares/request-logger.middleware";
import { buildErrorContext } from "@/core/middlewares/error-context";
import {
  formatPrismaResponse,
  formatHttpErrorResponse,
  formatUnknownErrorResponse,
} from "@/core/middlewares/error-response";
import { isPrismaError } from "@/core/errors";

import { env } from "@/core/env";

import { ErrorCode } from "@/core/errors";

/**
 * Global error handling middleware
 * Catches all errors thrown in the application and sends appropriate responses
 */
export function errorHandlerMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    next(error);
    return;
  }

  const requestLogger = getRequestLogger(req);
  const requestDuration = req.startTime ? Date.now() - req.startTime : undefined;
  const errorContext = buildErrorContext(error, req, res, requestDuration);

  // Log with appropriate level
  if (Boom.isHttpError(error) && error.isOperational) {
    requestLogger.warn(errorContext, `Operational error: ${error.message}`);
    logBusinessEvent({
      event: "operational_error",
      data: {
        errorType: error.constructor.name,
        errorCode: error.code,
        errorMessage: error.message,
        endpoint: `${req.method} ${req.path}`,
        userAgent: req.headers?.["user-agent"],
      },
      level: "warn",
    });
  } else {
    requestLogger.error(errorContext, `System error: ${error.message}`);
    Sentry.captureException(error, {
      extra: {
        traceId: errorContext.traceId,
        parentTraceId: errorContext.parentTraceId,
        breadcrumbs: errorContext.breadcrumbs,
        performance: errorContext.performance,
        request: errorContext.request,
      },
      tags: {
        traceId: errorContext.traceId,
      },
    });
    logBusinessEvent({
      event: "system_error",
      data: {
        errorType: error.constructor.name,
        errorMessage: error.message,
        endpoint: `${req.method} ${req.path}`,
        userAgent: req.headers?.["user-agent"],
      },
      level: "error",
    });
  }

  // Handle Prisma errors
  if (isPrismaError(error)) {
    return formatPrismaResponse(res, error);
  }
  // Handle HttpError (all Boom-created errors)
  if (Boom.isHttpError(error)) {
    formatHttpErrorResponse(res, error);
  } else {
    // Handle unknown errors
    formatUnknownErrorResponse(res, error);
  }
}

/**
 * Handle 404 errors
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestLogger = getRequestLogger(req);

  requestLogger.warn(
    {
      type: "not_found_error",
      method: req.method,
      path: req.path,
      url: req.url,
      userAgent: req.headers?.["user-agent"],
    },
    `Route not found: ${req.method} ${req.path}`,
  );

  res.status(ErrorCode.NOT_FOUND.status).json({
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND.code,
      message: `Cannot ${req.method} ${req.path}`,
    },
  });
}
