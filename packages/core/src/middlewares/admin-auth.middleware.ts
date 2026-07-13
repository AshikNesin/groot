import type { NextFunction, Request, Response } from "express";
import { Boom } from "@groot/core/errors";
import { env } from "@groot/core/env";

/**
 * Admin authentication middleware
 * Requires X-Admin-Auth-Key header with admin auth key
 */
export function adminAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const adminAuthKey = req.headers["x-admin-auth-key"];

  if (!adminAuthKey) {
    throw Boom.unauthorized("Admin authentication required");
  }

  if (adminAuthKey !== env.ADMIN_AUTH_KEY) {
    throw Boom.forbidden("Invalid admin auth key");
  }

  next();
}
