import type { Request, Response } from "express";
import { createRouter } from "@groot/core/utils/router.utils";
import { jwtAuthMiddleware } from "@groot/core/middlewares/jwt-auth.middleware";
import { parseId, requireUser, parseBody } from "@groot/core/utils/controller.utils";
import { setAuthCookie } from "@groot/core/utils/auth-cookie.utils";
import * as passkeyService from "./passkey.service";
import {
  verifyRegistrationSchema,
  verifyAuthenticationSchema,
  updatePasskeyNameSchema,
  generateAuthenticationOptionsSchema,
} from "./passkey.schema";

const router = createRouter();

router.post("/register/options", jwtAuthMiddleware, async (req: Request) => {
  const { userId } = requireUser(req);
  return await passkeyService.generateRegistrationOptions({ userId });
});

router.post("/register/verify", jwtAuthMiddleware, async (req: Request) => {
  const { userId } = requireUser(req);
  const payload = parseBody(req, verifyRegistrationSchema);
  return await passkeyService.verifyRegistration({
    userId,
    response: payload.response,
    credentialName: payload.credentialName,
  });
});

router.post("/login/options", async (req: Request) => {
  const body = parseBody(req, generateAuthenticationOptionsSchema);
  return await passkeyService.generateAuthenticationOptions({ email: body?.email });
});

router.post("/login/verify", async (req: Request, res: Response) => {
  const body = parseBody(req, verifyAuthenticationSchema);
  const result = await passkeyService.verifyAuthentication({
    email: body.email,
    response: body.response,
  });
  setAuthCookie(res, result.token);
  return result;
});

router.get("/list", jwtAuthMiddleware, async (req: Request) => {
  const { userId } = requireUser(req);
  return await passkeyService.listPasskeys({ userId });
});

router.delete("/:id", jwtAuthMiddleware, async (req: Request) => {
  const { userId } = requireUser(req);
  const passkeyId = parseId(req.params.id);
  return await passkeyService.deletePasskey({ userId, passkeyId });
});

router.patch("/:id", jwtAuthMiddleware, async (req: Request) => {
  const { userId } = requireUser(req);
  const passkeyId = parseId(req.params.id);
  const payload = parseBody(req, updatePasskeyNameSchema);
  return await passkeyService.updatePasskeyName({
    userId,
    passkeyId,
    credentialName: payload.credentialName,
  });
});

export default router;
