import type { NextFunction, Request, Response } from "express";
import { logger } from "@/core/logger";

export function requestLoggerMiddleware(req: Request, _res: Response, next: NextFunction) {
  logger.info({ method: req.method, path: req.path, query: req.query, ip: req.ip }, "Incoming request");
  next();
}
