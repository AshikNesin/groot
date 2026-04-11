import type { Request, Response } from "express";
import * as AuthService from "@/shared/auth/auth.service";
import type { LoginDTO, CreateUserDTO } from "@/shared/auth/auth.validation";
import { Boom } from "@/core/errors";
import { env } from "@/core/env";
import { JWT_EXPIRES_IN_MS } from "@/core/utils/jwt.utils";

/**
 * Handle user login
 */
export async function login(req: Request, res: Response) {
  const body = req.body as LoginDTO;
  const result = await AuthService.login(body);

  const isProduction = env.NODE_ENV === "production";

  res.cookie("token", result.token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: JWT_EXPIRES_IN_MS,
    path: "/",
  });

  return result;
}

/**
 * Handle user logout (placeholder)
 */
export async function logout(req: Request, res: Response) {
  res.clearCookie("token", { path: "/" });
  return { status: "logged out" };
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(req: Request) {
  const user = req.user;
  if (!user) {
    throw Boom.unauthorized("Authentication required");
  }

  return await AuthService.getUserById({ userId: user.userId });
}

/**
 * Create a new user (admin only)
 */
export async function createUser(req: Request) {
  const body = req.body as CreateUserDTO;
  return await AuthService.createUser(body);
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(req: Request) {
  return await AuthService.getAllUsers();
}
