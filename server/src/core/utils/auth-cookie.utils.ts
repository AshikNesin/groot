import type { Request, Response } from "express";
import { env } from "@/core/env";
import { JWT_EXPIRES_IN_MS } from "@/core/utils/jwt.utils";

const TOKEN_COOKIE_NAME = "token";

function getCookieOptions() {
  const isProduction = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("strict" as const) : ("lax" as const),
    maxAge: JWT_EXPIRES_IN_MS,
    path: "/",
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(TOKEN_COOKIE_NAME, token, getCookieOptions());
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(TOKEN_COOKIE_NAME, { path: "/" });
}

export function extractAuthToken(req: Request): string | undefined {
  if (req.cookies?.[TOKEN_COOKIE_NAME]) {
    return req.cookies[TOKEN_COOKIE_NAME];
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return undefined;
}
