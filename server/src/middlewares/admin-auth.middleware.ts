import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "@/core/errors";

/**
 * Admin authentication middleware
 * Requires X-Admin-Auth header with admin auth key
 */
export function adminAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const adminAuthKey = req.headers["x-admin-auth"];

  if (!adminAuthKey) {
    throw new UnauthorizedError("Admin authentication required");
  }

  const expectedKey = process.env.ADMIN_AUTH_KEY || "change-this-in-production";

  if (adminAuthKey !== expectedKey) {
    throw new ForbiddenError("Invalid admin auth key");
  }

  next();
}
