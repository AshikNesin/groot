import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt.utils";
import { Boom } from "../errors";
import { extractAuthToken } from "../utils/auth-cookie.utils";

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
