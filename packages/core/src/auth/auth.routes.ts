import type { Request, Response } from "express";
import { createRouter } from "@groot/core/utils/router.utils";
import { jwtAuthMiddleware } from "@groot/core/middlewares/jwt-auth.middleware";
import { adminAuthMiddleware } from "@groot/core/middlewares/admin-auth.middleware";
import { requireUser, parseBody } from "@groot/core/utils/controller.utils";
import { setAuthCookie, clearAuthCookie } from "@groot/core/utils/auth-cookie.utils";
import * as AuthService from "./auth.service";
import { loginSchema, createUserSchema } from "./auth.validation";

const router = createRouter();

router.post("/login", async (req: Request, res: Response) => {
  const body = parseBody(req, loginSchema);
  const result = await AuthService.login(body);
  setAuthCookie(res, result.token);
  return result;
});

router.post("/logout", jwtAuthMiddleware, async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  return { status: "logged out" };
});

router.get("/me", jwtAuthMiddleware, async (req: Request) => {
  const user = requireUser(req);
  return await AuthService.getUserById({ userId: user.userId });
});

router.post("/users", adminAuthMiddleware, async (req: Request) => {
  const body = parseBody(req, createUserSchema);
  return await AuthService.createUser(body);
});

router.get("/users", adminAuthMiddleware, async () => {
  return await AuthService.getAllUsers();
});

export default router;
