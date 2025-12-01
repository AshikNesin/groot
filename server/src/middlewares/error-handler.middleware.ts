import type { NextFunction, Request, Response } from "express";
import {
  AppError,
  ValidationError,
  handlePrismaError,
  isPrismaError,
} from "@/core/errors";
import { Sentry } from "@/core/instrument";
import { logBusinessEvent } from "@/core/logger";
import { getBreadcrumbs } from "@/core/logger/breadcrumbs";
import { getCurrentTraceContext } from "@/core/logger/trace-context";
import { sanitizeRequestBody } from "@/core/logger/utils";
import { ResponseHandler } from "@/core/response-handler";
import { ZodError } from "zod";
import { getRequestLogger } from "@/middlewares/requestLogger.middleware";

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

  // Get request logger for correlation
  const requestLogger = getRequestLogger(req);
  const requestDuration = req.startTime
    ? Date.now() - req.startTime
    : undefined;

  // Get trace context and breadcrumbs
  const traceContext = getCurrentTraceContext();
  const breadcrumbs = getBreadcrumbs();

  // Sanitize request body for logging (remove sensitive data)
  const sanitizedBody = sanitizeRequestBody(req.body);

  // Enhanced error logging with full context
  const errorContext = {
    type: "application_error",
    traceId: traceContext?.traceId,
    parentTraceId: traceContext?.parentTraceId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      isOperational: error instanceof AppError ? error.isOperational : false,
    },
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      params: req.params,
      query: req.query,
      body: sanitizedBody,
      userAgent: req.headers?.["user-agent"],
      ip: req.ip || req.headers?.["x-forwarded-for"],
    },
    response: {
      statusCode: res.statusCode,
      headersSent: res.headersSent,
    },
    performance: requestDuration
      ? {
          requestDuration: `${requestDuration}ms`,
        }
      : undefined,
    breadcrumbs: breadcrumbs.map((b) => ({
      timestamp: b.timestamp,
      category: b.category,
      message: b.message,
      level: b.level,
    })),
  };

  // Log with appropriate level based on error type
  if (error instanceof AppError && error.isOperational) {
    // Operational errors (expected business logic errors)
    requestLogger.warn(errorContext, `Operational error: ${error.message}`);

    // Log as business event for operational errors
    logBusinessEvent(
      "operational_error",
      {
        errorType: error.constructor.name,
        errorCode: error.code,
        errorMessage: error.message,
        endpoint: `${req.method} ${req.path}`,
        userAgent: req.headers?.["user-agent"],
      },
      "warn",
    );
  } else {
    // Unexpected errors (system failures)
    requestLogger.error(errorContext, `System error: ${error.message}`);

    // Capture in Sentry with breadcrumbs and trace context
    Sentry.captureException(error, {
      extra: {
        traceId: traceContext?.traceId,
        parentTraceId: traceContext?.parentTraceId,
        breadcrumbs,
        performance: errorContext.performance,
        request: errorContext.request,
      },
      tags: {
        traceId: traceContext?.traceId,
      },
    });

    // Log as business event for system errors
    logBusinessEvent(
      "system_error",
      {
        errorType: error.constructor.name,
        errorMessage: error.message,
        endpoint: `${req.method} ${req.path}`,
        userAgent: req.headers?.["user-agent"],
      },
      "error",
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};

    for (const err of error.errors) {
      const field = err.path.join(".");
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(err.message);
    }

    // Log validation error with detailed context
    requestLogger.warn(
      {
        type: "validation_error",
        validationErrors: errors,
        fieldCount: Object.keys(errors).length,
        receivedData: sanitizedBody,
      },
      `Validation failed with ${Object.keys(errors).length} field errors`,
    );

    // Log as business event for monitoring
    logBusinessEvent(
      "validation_failed",
      {
        errorCount: error.errors.length,
        fieldCount: Object.keys(errors).length,
        endpoint: `${req.method} ${req.path}`,
      },
      "warn",
    );

    ResponseHandler.error(
      res,
      "Validation failed",
      "VALIDATION_ERROR",
      400,
      errors,
    );
    return;
  }

  // Handle Prisma errors
  if (isPrismaError(error)) {
    try {
      handlePrismaError(error);
    } catch (handledError) {
      if (handledError instanceof AppError) {
        ResponseHandler.error(
          res,
          handledError.message,
          handledError.code,
          handledError.statusCode,
        );
        return;
      }
    }
  }

  // Handle custom application errors
  if (error instanceof AppError) {
    // Check if it's a ValidationError with field-level errors
    const details = error instanceof ValidationError ? error.errors : undefined;

    ResponseHandler.error(
      res,
      error.message,
      error.code,
      error.statusCode,
      details,
    );
    return;
  }

  // Handle unknown errors
  const isDevelopment = process.env.NODE_ENV === "development";

  ResponseHandler.error(
    res,
    isDevelopment ? error.message : "An unexpected error occurred",
    "INTERNAL_SERVER_ERROR",
    500,
    isDevelopment ? { stack: error.stack } : undefined,
  );
}

/**
 * Handle 404 errors
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestLogger = getRequestLogger(req);

  // Log 404 with context
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

  ResponseHandler.error(
    res,
    `Cannot ${req.method} ${req.path}`,
    "NOT_FOUND",
    404,
  );
}
