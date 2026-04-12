import jwt from "jsonwebtoken";
import ms from "ms";
import { Boom } from "@/core/errors";
import { env } from "@/core/env";
import { config } from "@/core/config";

interface JWTPayload {
  userId: number;
  email: string;
}

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = config.auth.jwtExpiresIn;

export const JWT_EXPIRES_IN_MS = ms(JWT_EXPIRES_IN);
if (!JWT_EXPIRES_IN_MS) {
  throw new Error(
    `Invalid JWT_EXPIRES_IN format: "${JWT_EXPIRES_IN}". Expected format like "30d", "24h", "60m", or "3600s".`,
  );
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw Boom.unauthorized("Token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw Boom.unauthorized("Invalid token");
    }
    throw Boom.unauthorized("Token verification failed");
  }
}

/**
 * Decode a token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
