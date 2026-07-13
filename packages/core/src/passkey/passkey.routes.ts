import type { Request, Response } from "express";
import { createRouter } from "@groot/core/utils/router.utils";
import { jwtAuthMiddleware } from "@groot/core/middlewares/jwt-auth.middleware";
import { parseId, requireUser, parseBody } from "@groot/core/utils/controller.utils";
import { setAuthCookie } from "@groot/core/utils/auth-cookie.utils";
import * as PasskeyService from "./passkey.service";
import {
  verifyRegistrationSchema,
  verifyAuthenticationSchema,
  updatePasskeyNameSchema,
  generateAuthenticationOptionsSchema,
} from "./passkey.validation";

const router = createRouter();

router.post("/register/options", jwtAuthMiddleware, async (req: Request) => {
  const { userId } = requireUser(req);
  return await PasskeyService.generateRegistrationOptions({ userId });
});

router.post("/register/verify", jwtAuthMiddleware, async (req: Request) => {
  const { userId } = requireUser(req);
  const payload = parseBody(req, verifyRegistrationSchema);
  return await PasskeyService.verifyRegistration({
    userId,
    response: payload.response,
    credentialName: payload.credentialName,
  });
});

router.post("/login/options", async (req: Request) => {
  const body = parseBody(req, generateAuthenticationOptionsSchema);
  return await PasskeyService.generateAuthenticationOptions({ email: body?.email });
});

router.post("/login/verify", async (req: Request, res: Response) => {
  const body = parseBody(req, verifyAuthenticationSchema);
  const result = await PasskeyService.verifyAuthentication({
    email: body.email,
    response: body.response,
  });
  setAuthCookie(res, result.token);
  return result;
});

router.get("/list", jwtAuthMiddleware, async (req: Request) => {
  const { userId } = requireUser(req);
  return await PasskeyService.listPasskeys({ userId });
});

router.delete("/:id", jwtAuthMiddleware, async (req: Request) => {
  const { userId } = requireUser(req);
  const passkeyId = parseId(req.params.id);
  return await PasskeyService.deletePasskey({ userId, passkeyId });
});

router.patch("/:id", jwtAuthMiddleware, async (req: Request) => {
  const { userId } = requireUser(req);
  const passkeyId = parseId(req.params.id);
  const payload = parseBody(req, updatePasskeyNameSchema);
  return await PasskeyService.updatePasskeyName({
    userId,
    passkeyId,
    credentialName: payload.credentialName,
  });
});

export default router;
