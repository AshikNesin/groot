import { createRouter } from "@groot/core/utils/router.utils";
import * as passkeyController from "./passkey.controller";
import { jwtAuthMiddleware } from "@groot/core/middlewares/jwt-auth.middleware";

const router = createRouter();

// Generate registration options (requires authentication)
router.post("/register/options", jwtAuthMiddleware, passkeyController.generateRegistrationOptions);

// Verify registration (requires authentication)
router.post("/register/verify", jwtAuthMiddleware, passkeyController.verifyRegistration);

// Generate authentication options (public endpoint)
router.post("/login/options", passkeyController.generateAuthenticationOptions);

// Verify authentication (public endpoint)
router.post("/login/verify", passkeyController.verifyAuthentication);

// List passkeys (requires authentication)
router.get("/list", jwtAuthMiddleware, passkeyController.listPasskeys);

// Delete passkey (requires authentication)
router.delete("/:id", jwtAuthMiddleware, passkeyController.deletePasskey);

// Update passkey name (requires authentication)
router.patch("/:id", jwtAuthMiddleware, passkeyController.updatePasskeyName);

export default router;
