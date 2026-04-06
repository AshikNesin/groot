import type { NextFunction, Request, Response } from "express";
import { Boom, ErrorCode } from "@/core/errors";
import { Sentry } from "@/core/instrument";
import { logBusinessEvent } from "@/core/logger";
import { getBreadcrumbs } from "@/core/logger/breadcrumbs";
import { getCurrentTraceContext } from "@/core/logger/trace-context";
import { sanitizeRequestBody } from "@/core/logger/utils";
import { ZodError } from "zod";
import { getRequestLogger } from "@/core/middlewares/requestLogger.middleware";
import { env } from "@/core/env";

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
  const requestDuration = req.startTime ? Date.now() - req.startTime : undefined;

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
      isOperational: Boom.isHttpError(error) ? error.isOperational : false,
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
  if (Boom.isHttpError(error) && error.isOperational) {
    // Operational errors (expected business logic errors)
    requestLogger.warn(errorContext, `Operational error: ${error.message}`);

    // Log as business event for operational errors
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
    logBusinessEvent({
      event: "validation_failed",
      data: {
        errorCount: error.errors.length,
        fieldCount: Object.keys(errors).length,
        endpoint: `${req.method} ${req.path}`,
      },
      level: "warn",
    });

    res.status(ErrorCode.VALIDATION_ERROR.status).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR.code,
        message: "Validation failed",
        details: errors,
      },
    });
    return;
  }

  // Handle Prisma errors
  if (isPrismaError(error)) {
    try {
      handlePrismaError(error);
    } catch (handledError) {
      if (Boom.isHttpError(handledError)) {
        const { statusCode, message, code, data } = handledError.output;
        res.status(statusCode).json({
          success: false,
          error: {
            code,
            message,
            details: data,
          },
        });
        return;
      }
    }
  }

  // Handle HttpError (all Boom-created errors)
  if (Boom.isHttpError(error)) {
    const { statusCode, message, code, data } = error.output;
    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details: data,
      },
    });
    return;
  }

  // Handle unknown errors
  const isDevelopment = env.NODE_ENV === "development";

  res.status(ErrorCode.INTERNAL_ERROR.status).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR.code,
      message: isDevelopment ? error.message : "An unexpected error occurred",
      details: isDevelopment ? { stack: error.stack } : undefined,
    },
  });
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

  res.status(ErrorCode.NOT_FOUND.status).json({
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND.code,
      message: `Cannot ${req.method} ${req.path}`,
    },
  });
}

// Re-import for use in this file
import { isPrismaError, handlePrismaError } from "@/core/errors";
