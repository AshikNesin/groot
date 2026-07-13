import type { Response } from "express";
import { ErrorCode, handlePrismaError, Boom } from "@groot/core/errors";
import { env } from "@groot/core/env";
import { sendError } from "@groot/core/utils/api-response.utils";

export function formatPrismaResponse(res: Response, error: unknown): void {
  try {
    handlePrismaError(error as Parameters<typeof handlePrismaError>[0]);
  } catch (handledError) {
    if (Boom.isHttpError(handledError)) {
      const { statusCode, message, code, data } = handledError.output;
      sendError(res, { code, message, details: data }, statusCode);
    }
  }
}

export function formatHttpErrorResponse(res: Response, error: Error): void {
  if (Boom.isHttpError(error)) {
    const { statusCode, message, code, data } = error.output;
    sendError(res, { code, message, details: data }, statusCode);
  }
}

export function formatUnknownErrorResponse(res: Response, error: Error): void {
  const isDevelopment = env.NODE_ENV === "development";

  sendError(
    res,
    {
      code: ErrorCode.INTERNAL_ERROR.code,
      message: isDevelopment ? error.message : "An unexpected error occurred",
      details: isDevelopment ? { stack: error.stack } : undefined,
    },
    ErrorCode.INTERNAL_ERROR.status,
  );
}
