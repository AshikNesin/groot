import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Type for async handlers that can return Response (from ResponseHandler methods)
 * Generic to support custom Request parameter types
 */
export type AsyncHandler<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, string>,
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response,
  next: NextFunction,
) => Promise<void | Response>;

/**
 * Wraps async route handlers to automatically catch errors and pass them to the error middleware
 * This eliminates the need for try-catch blocks in every controller method
 */
export function asyncHandler<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, string>,
>(fn: AsyncHandler<P, ResBody, ReqBody, ReqQuery>): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
