import { Router } from "express";
import { passkeyController } from "@/controllers/passkey.controller";
import { jwtAuthMiddleware } from "@/middlewares/jwt-auth.middleware";
import { validate } from "@/middlewares/validation.middleware";
import {
  verifyRegistrationSchema,
  verifyAuthenticationSchema,
  generateAuthenticationOptionsSchema,
  updatePasskeyNameSchema,
} from "@/validations/passkey.validation";

const router = Router();

// Generate registration options (requires authentication)
router.post(
  "/register/options",
  jwtAuthMiddleware,
  passkeyController.generateRegistrationOptions,
);

// Verify registration (requires authentication)
router.post(
  "/register/verify",
  jwtAuthMiddleware,
  validate(verifyRegistrationSchema),
  passkeyController.verifyRegistration,
);

// Generate authentication options (public endpoint)
router.post(
  "/login/options",
  validate(generateAuthenticationOptionsSchema),
  passkeyController.generateAuthenticationOptions,
);

// Verify authentication (public endpoint)
router.post(
  "/login/verify",
  validate(verifyAuthenticationSchema),
  passkeyController.verifyAuthentication,
);

// List passkeys (requires authentication)
router.get("/list", jwtAuthMiddleware, passkeyController.listPasskeys);

// Delete passkey (requires authentication)
router.delete("/:id", jwtAuthMiddleware, passkeyController.deletePasskey);

// Update passkey name (requires authentication)
router.patch(
  "/:id",
  jwtAuthMiddleware,
  validate(updatePasskeyNameSchema),
  passkeyController.updatePasskeyName,
);

export default router;
