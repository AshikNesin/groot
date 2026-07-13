import jwt from "jsonwebtoken";
import ms from "ms";
import { Boom } from "@groot/core/errors";
import { env } from "@groot/core/env";
import { config } from "@groot/core/config";

interface JWTPayload {
  userId: number;
  email: string;
}

const JWT_SECRET = env.JWT_SECRET_KEY;
const JWT_EXPIRES_IN = config.auth.jwtExpiresIn;

// `jwtExpiresIn` is a runtime-validated config string (e.g. "30d"); narrow it to
// ms's `StringValue` template type (the guard below rejects anything invalid).
export const JWT_EXPIRES_IN_MS = ms(JWT_EXPIRES_IN as ms.StringValue);
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
    expiresIn: JWT_EXPIRES_IN as ms.StringValue,
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

export { jwt };
