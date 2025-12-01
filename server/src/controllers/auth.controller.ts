import type { Request, Response } from "express";
import { authService } from "@/services/auth.service";
import { ResponseHandler } from "@/core/response-handler";
import { asyncHandler } from "@/core/async-handler";

/**
 * Auth controller
 */
export const authController = {
  /**
   * Login with email and password
   */
  login: asyncHandler(async (req: Request, res: Response) => {
    const { token, user } = await authService.login(req.body);

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return ResponseHandler.success(
      res,
      { token, user },
      "Login successful",
    );
  }),

  /**
   * Logout and clear cookie
   */
  logout: asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie("token");
    return ResponseHandler.success(res, null, "Logout successful");
  }),

  /**
   * Get current authenticated user
   */
  getCurrentUser: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.error(
        res,
        "Not authenticated",
        "UNAUTHORIZED",
        401,
      );
    }

    const user = await authService.getUserById(req.user.userId);
    return ResponseHandler.success(res, user, "User retrieved");
  }),

  /**
   * Create a new user (admin only)
   */
  createUser: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.createUser(req.body);
    return ResponseHandler.created(res, user, "User created successfully");
  }),

  /**
   * Get all users (admin only)
   */
  getAllUsers: asyncHandler(async (_req: Request, res: Response) => {
    const users = await authService.getAllUsers();
    return ResponseHandler.success(res, users, "Users retrieved");
  }),
};
