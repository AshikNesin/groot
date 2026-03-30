import type { Request, Response } from "express";
import { BaseController } from "@/core/base-controller";
import { ResponseHandler } from "@/core/response-handler";
import { authService } from "@/services/auth.service";
import { Boom } from "@/core/errors";

class AuthController extends BaseController {
  /**
   * Login with email and password
   */
  async login(req: Request, res: Response) {
    const { token, user } = await authService.login(req.body);

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return ResponseHandler.success(res, { token, user }, "Login successful");
  }

  /**
   * Logout and clear cookie
   */
  async logout(_req: Request, res: Response) {
    res.clearCookie("token");
    return ResponseHandler.success(res, null, "Logout successful");
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(req: Request, res: Response) {
    if (!req.user) {
      throw Boom.unauthorized("Not authenticated");
    }

    const user = await authService.getUserById(req.user.userId);
    return ResponseHandler.success(res, user, "User retrieved");
  }

  /**
   * Create a new user (admin only)
   */
  async createUser(req: Request, res: Response) {
    const user = await authService.createUser(req.body);
    return ResponseHandler.created(res, user, "User created successfully");
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(_req: Request, res: Response) {
    const users = await authService.getAllUsers();
    return ResponseHandler.success(res, users, "Users retrieved");
  }
}

export const authController = new AuthController();
