import { Request, Response, NextFunction } from "express";
import { logger } from "@/core/logger";

export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  logger.info({
    method: req.method,
    url: req.url,
    query: req.query,
    ip: req.ip,
  }, "incoming request");
  next();
};

export const errorLoggerMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.error({
    err,
    method: req.method,
    url: req.url,
  }, "request error occurred");
  
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
};
