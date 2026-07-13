import { createRouter } from "@groot/core/utils/router.utils";
import * as authController from "./auth.controller";
import { jwtAuthMiddleware } from "@groot/core/middlewares/jwt-auth.middleware";
import { adminAuthMiddleware } from "@groot/core/middlewares/admin-auth.middleware";

const router = createRouter();

// Login endpoint (public)
router.post("/login", authController.login);

// Logout endpoint (requires JWT authentication)
router.post("/logout", jwtAuthMiddleware, authController.logout);

// Get current user (requires JWT authentication)
router.get("/me", jwtAuthMiddleware, authController.getCurrentUser);

// Create new user (requires admin auth key)
router.post("/users", adminAuthMiddleware, authController.createUser);

// Get all users (requires admin auth key)
router.get("/users", adminAuthMiddleware, authController.getAllUsers);

export default router;
