import { Router } from "express";
import { authController } from "@/controllers/auth.controller";
import { validate } from "@/middlewares/validation.middleware";
import { jwtAuthMiddleware } from "@/middlewares/jwt-auth.middleware";
import { adminAuthMiddleware } from "@/middlewares/admin-auth.middleware";
import {
  loginSchema,
  createUserSchema,
} from "@/validations/auth.validation";

const router = Router();

// Login endpoint (public)
router.post("/login", validate(loginSchema, "body"), authController.login);

// Logout endpoint (requires JWT authentication)
router.post("/logout", jwtAuthMiddleware, authController.logout);

// Get current user (requires JWT authentication)
router.get("/me", jwtAuthMiddleware, authController.getCurrentUser);

// Create new user (requires admin auth key)
router.post(
  "/users",
  adminAuthMiddleware,
  validate(createUserSchema, "body"),
  authController.createUser,
);

// Get all users (requires admin auth key)
router.get("/users", adminAuthMiddleware, authController.getAllUsers);

export default router;
