import type { Request } from "express";
import * as AuthService from "@/shared/auth/auth.service";
import type { LoginDTO, CreateUserDTO } from "@/shared/auth/auth.validation";
import { Boom } from "@/core/errors";

/**
 * Handle user login
 */
export async function login(req: Request) {
  const body = (req.validated?.body || req.body) as LoginDTO;
  return await AuthService.login(body);
}

/**
 * Handle user logout (placeholder)
 */
export async function logout(req: Request) {
  // Logic for logout if needed (e.g., token revocation)
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
  const body = (req.validated?.body || req.body) as CreateUserDTO;
  return await AuthService.createUser(body);
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(req: Request) {
  return await AuthService.getAllUsers();
}
