import type { NextFunction, Request, Response } from "express";
import { AppError } from "@/core/errors/base.errors";
import { ResponseHandler } from "@/core/response-handler";
import { logger } from "@/core/logger";

export function errorHandlerMiddleware(error: Error, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(error);
  }

  logger.error({
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  if (error instanceof AppError) {
    return ResponseHandler.error(res, error.message, error.code, error.statusCode, error instanceof Error ? error.stack : undefined);
  }

  return ResponseHandler.error(res, "Internal server error", "INTERNAL_SERVER_ERROR", 500);
}

export function notFoundHandler(req: Request, res: Response) {
  return ResponseHandler.error(res, `Route ${req.method} ${req.path} not found`, "NOT_FOUND", 404);
}
