import jwt from "jsonwebtoken";
import { Boom } from "@/core/errors";
import { env } from "@/core/env";

interface JWTPayload {
  userId: number;
  email: string;
}

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;

const MS_PER_UNIT: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

const expiresMatch = JWT_EXPIRES_IN.match(/^(\d+)([smhd])$/);
if (!expiresMatch) {
  throw new Error(
    `Invalid JWT_EXPIRES_IN format: "${JWT_EXPIRES_IN}". Expected format like "30d", "24h", "60m", or "3600s".`,
  );
}
export const JWT_EXPIRES_IN_MS = parseInt(expiresMatch[1], 10) * MS_PER_UNIT[expiresMatch[2]];

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
