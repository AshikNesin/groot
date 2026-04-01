import type { NextFunction, Request, Response } from "express";
import { Boom } from "@/core/errors";

/**
 * Admin authentication middleware
 * Requires X-Admin-Auth header with admin auth key
 */
export function adminAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const adminAuthKey = req.headers["x-admin-auth"];

  if (!adminAuthKey) {
    throw Boom.unauthorized("Admin authentication required");
  }

  const expectedKey = process.env.ADMIN_AUTH_KEY || "change-this-in-production";

  if (adminAuthKey !== expectedKey) {
    throw Boom.forbidden("Invalid admin auth key");
  }

  next();
}
