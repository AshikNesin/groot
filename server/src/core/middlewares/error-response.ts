import type { Response } from "express";
import type { Logger } from "pino";
import { ErrorCode, isPrismaError, handlePrismaError, Boom } from "@/core/errors";
import { env } from "@/core/env";
import { ZodError } from "zod";
import { logBusinessEvent } from "@/core/logger";

export function formatZodResponse(
  res: Response,
  error: ZodError,
  requestLogger: Logger,
  sanitizedBody: unknown,
  method: string,
  path: string,
): void {
  const errors: Record<string, string[]> = {};

  for (const err of error.errors) {
    const field = err.path.join(".");
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(err.message);
  }

  requestLogger.warn(
    {
      type: "validation_error",
      validationErrors: errors,
      fieldCount: Object.keys(errors).length,
      receivedData: sanitizedBody,
    },
    `Validation failed with ${Object.keys(errors).length} field errors`,
  );

  logBusinessEvent({
    event: "validation_failed",
    data: {
      errorCount: error.errors.length,
      fieldCount: Object.keys(errors).length,
      endpoint: `${method} ${path}`,
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
}

export function formatPrismaResponse(res: Response, error: unknown): void {
  try {
    handlePrismaError(error as Parameters<typeof handlePrismaError>[0]);
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
    }
  }
}

export function formatHttpErrorResponse(res: Response, error: Error): void {
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
  }
}

export function formatUnknownErrorResponse(res: Response, error: Error): void {
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
