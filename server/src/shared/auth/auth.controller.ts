import type { Request, Response } from "express";
import { ResponseHandler } from "@/core/response-handler";
import * as AuthService from "./auth.service";
import { Boom } from "@/core/errors";
import { env } from "@/core/env";

/**
 * Login with email and password
 */
export async function login(req: Request, res: Response) {
  const { token, user } = await AuthService.login(req.body);

  // Set HTTP-only cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  ResponseHandler.success(res, { token, user }, "Login successful");
}

/**
 * Logout and clear cookie
 */
export async function logout(_req: Request, res: Response) {
  res.clearCookie("token");
  ResponseHandler.success(res, null, "Logout successful");
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    throw Boom.unauthorized("Not authenticated");
  }

  const user = await AuthService.getUserById({ userId: req.user.userId });
  ResponseHandler.success(res, user, "User retrieved");
}

/**
 * Create a new user (admin only)
 */
export async function createUser(req: Request, res: Response) {
  const user = await AuthService.createUser(req.body);
  ResponseHandler.created(res, user, "User created successfully");
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(_req: Request, res: Response) {
  const users = await AuthService.getAllUsers();
  ResponseHandler.success(res, users, "Users retrieved");
}
