import { createRouter } from "@groot/core/utils/router.utils";
import * as authController from "./auth.controller";
import { validateBody } from "@groot/core/middlewares/validation.middleware";
import { jwtAuthMiddleware } from "@groot/core/middlewares/jwt-auth.middleware";
import { adminAuthMiddleware } from "@groot/core/middlewares/admin-auth.middleware";
import { loginSchema, createUserSchema } from "./auth.validation";

const router = createRouter();

// Login endpoint (public)
router.post("/login", validateBody(loginSchema), authController.login);

// Logout endpoint (requires JWT authentication)
router.post("/logout", jwtAuthMiddleware, authController.logout);

// Get current user (requires JWT authentication)
router.get("/me", jwtAuthMiddleware, authController.getCurrentUser);

// Create new user (requires admin auth key)
router.post(
  "/users",
  adminAuthMiddleware,
  validateBody(createUserSchema),
  authController.createUser,
);

// Get all users (requires admin auth key)
router.get("/users", adminAuthMiddleware, authController.getAllUsers);

export default router;
