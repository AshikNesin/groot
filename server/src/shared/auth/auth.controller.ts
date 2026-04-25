import type { Request, Response } from "express";
import * as AuthService from "@/shared/auth/auth.service";
import type { LoginDTO, CreateUserDTO } from "@/shared/auth/auth.validation";
import { Boom } from "@/core/errors";
import { setAuthCookie, clearAuthCookie } from "@/core/utils/auth-cookie.utils";

export async function login(req: Request, res: Response) {
  const body = req.body as LoginDTO;
  const result = await AuthService.login(body);

  setAuthCookie(res, result.token);

  return result;
}

export async function logout(req: Request, res: Response) {
  clearAuthCookie(res);
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
