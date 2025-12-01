import type { NextFunction, Request, Response } from "express";
import { logger } from "@/core/logger";
import { verifyToken } from "@/utils/jwt.utils";

/**
 * Extend Express Request to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
      };
    }
  }
}

/**
 * JWT Authentication Middleware
 * Verifies JWT token from cookie or Authorization header
 * Attaches user information to request object if valid
 */
export function jwtAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    // Try to get token from cookie first, then from Authorization header
    let token: string | undefined;

    // 1. Check for token in cookie
    if (req.cookies?.token) {
      token = req.cookies.token;
    }
    // 2. Check for token in Authorization header (Bearer token)
    else if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      res.status(401).json({
        error: "Authentication required",
        message: "No token provided",
      });
      return;
    }

    // Verify the token
    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Invalid token";
    logger.debug({ error: errorMessage }, "JWT authentication failed");

    res.status(401).json({
      error: "Authentication failed",
      message: errorMessage,
    });
  }
}

/**
 * Optional JWT Authentication Middleware
 * Verifies JWT token if present, but doesn't require it
 * Attaches user information to request object if token is valid
 */
export function optionalJwtAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    // Try to get token from cookie first, then from Authorization header
    let token: string | undefined;

    if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    // If no token, just continue without authentication
    if (!token) {
      next();
      return;
    }

    // Verify the token
    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch {
    // If token is invalid, just continue without authentication
    // This allows the endpoint to handle unauthenticated requests
    next();
  }
}
