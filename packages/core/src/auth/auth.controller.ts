import type { Request, Response } from "express";
import * as AuthService from "./auth.service";
import type { LoginDTO, CreateUserDTO } from "./auth.validation";
import { requireUser, validatedBody } from "@groot/core/utils/controller.utils";
import { setAuthCookie, clearAuthCookie } from "@groot/core/utils/auth-cookie.utils";

export async function login(req: Request, res: Response) {
  const body = validatedBody<LoginDTO>(req);
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
  const user = requireUser(req);
  return await AuthService.getUserById({ userId: user.userId });
}

/**
 * Create a new user (admin only)
 */
export async function createUser(req: Request) {
  const body = validatedBody<CreateUserDTO>(req);
  return await AuthService.createUser(body);
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers() {
  return await AuthService.getAllUsers();
}
