import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "@/core/utils/jwt.utils";
import { Boom } from "@/core/errors";
import { extractAuthToken } from "@/core/utils/auth-cookie.utils";

export function jwtAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractAuthToken(req);

    if (!token) {
      throw Boom.unauthorized("No token provided");
    }

    const decoded = verifyToken(token);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function optionalJwtAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractAuthToken(req);

    if (!token) {
      next();
      return;
    }

    const decoded = verifyToken(token);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch {
    next();
  }
}
