import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps async route handlers to automatically catch errors and pass them to the error middleware
 * This eliminates the need for try-catch blocks in every controller method
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Type-safe async handler that ensures the handler returns void or Response
 */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<undefined | Response | void>;

export function asyncWrapper(handler: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
