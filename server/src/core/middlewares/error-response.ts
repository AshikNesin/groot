import type { Response } from "express";
import { ErrorCode, isPrismaError, handlePrismaError, Boom } from "@/core/errors";
import { env } from "@/core/env";
import { logBusinessEvent } from "@/core/logger";

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
