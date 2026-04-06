import { Router } from "express";
import * as passkeyController from "./passkey.controller";
import { jwtAuthMiddleware } from "@/core/middlewares/jwt-auth.middleware";
import { validate } from "@/core/middlewares/validation.middleware";
import { handle } from "@/core/middlewares/route-handler.middleware";
import {
  verifyRegistrationSchema,
  verifyAuthenticationSchema,
  generateAuthenticationOptionsSchema,
  updatePasskeyNameSchema,
} from "@/shared/passkey/passkey.validation";

const router = Router();

// Generate registration options (requires authentication)
router.post(
  "/register/options",
  jwtAuthMiddleware,
  handle(passkeyController.generateRegistrationOptions),
);

// Verify registration (requires authentication)
router.post(
  "/register/verify",
  jwtAuthMiddleware,
  validate(verifyRegistrationSchema),
  handle(passkeyController.verifyRegistration),
);

// Generate authentication options (public endpoint)
router.post(
  "/login/options",
  validate(generateAuthenticationOptionsSchema),
  handle(passkeyController.generateAuthenticationOptions),
);

// Verify authentication (public endpoint)
router.post(
  "/login/verify",
  validate(verifyAuthenticationSchema),
  handle(passkeyController.verifyAuthentication),
);

// List passkeys (requires authentication)
router.get("/list", jwtAuthMiddleware, handle(passkeyController.listPasskeys));

// Delete passkey (requires authentication)
router.delete("/:id", jwtAuthMiddleware, handle(passkeyController.deletePasskey));

// Update passkey name (requires authentication)
router.patch(
  "/:id",
  jwtAuthMiddleware,
  validate(updatePasskeyNameSchema),
  handle(passkeyController.updatePasskeyName),
);

export default router;
