import { BaseController } from "@/core/base-controller";
import { ResponseHandler } from "@/core/response-handler";
import { passkeyService } from "@/services/passkey.service";
import type { Request, Response } from "express";
import { asyncHandler } from "@/core/async-handler";

export class PasskeyController extends BaseController {
  /**
   * Generate registration options for a new passkey
   * Requires authentication
   */
  generateRegistrationOptions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.error(res, "Not authenticated", "UNAUTHORIZED", 401);
      return;
    }

    const options = await passkeyService.generateRegistrationOptions(req.user.userId);

    ResponseHandler.success(res, options, "Registration options generated successfully");
  });

  /**
   * Verify registration response and create passkey
   * Requires authentication
   */
  verifyRegistration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.error(res, "Not authenticated", "UNAUTHORIZED", 401);
      return;
    }

    const { response, credentialName } = req.body;

    const passkey = await passkeyService.verifyRegistration(
      req.user.userId,
      response,
      credentialName,
    );

    ResponseHandler.created(
      res,
      {
        id: passkey.id,
        credentialName: passkey.credentialName,
        createdAt: passkey.createdAt,
      },
      "Passkey registered successfully",
    );
  });

  /**
   * Generate authentication options for passkey login
   * Public endpoint (no authentication required)
   */
  generateAuthenticationOptions = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email } = req.body;

      const options = await passkeyService.generateAuthenticationOptions(email);

      ResponseHandler.success(res, options, "Authentication options generated successfully");
    },
  );

  /**
   * Verify authentication response and login user
   * Public endpoint (no authentication required)
   */
  verifyAuthentication = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { response, email } = req.body;

    const { token, user } = await passkeyService.verifyAuthentication(response, email);

    // Set cookie with JWT token (expires in 30 days)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    });

    ResponseHandler.success(res, { token, user }, "Authentication successful");
  });

  /**
   * List all passkeys for the authenticated user
   * Requires authentication
   */
  listPasskeys = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.error(res, "Not authenticated", "UNAUTHORIZED", 401);
      return;
    }

    const passkeys = await passkeyService.listPasskeys(req.user.userId);

    ResponseHandler.success(res, passkeys);
  });

  /**
   * Delete a passkey
   * Requires authentication
   */
  deletePasskey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.error(res, "Not authenticated", "UNAUTHORIZED", 401);
      return;
    }

    const passkeyId = this.parseId(req.params.id, "Passkey ID");

    await passkeyService.deletePasskey(passkeyId, req.user.userId);

    ResponseHandler.success(res, null, "Passkey deleted successfully");
  });

  /**
   * Update passkey name
   * Requires authentication
   */
  updatePasskeyName = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.error(res, "Not authenticated", "UNAUTHORIZED", 401);
      return;
    }

    const passkeyId = this.parseId(req.params.id, "Passkey ID");
    const { credentialName } = req.body;

    const updatedPasskey = await passkeyService.updatePasskeyName(
      passkeyId,
      req.user.userId,
      credentialName,
    );

    ResponseHandler.success(
      res,
      {
        id: updatedPasskey.id,
        credentialName: updatedPasskey.credentialName,
      },
      "Passkey name updated successfully",
    );
  });
}

// Export singleton instance
export const passkeyController = new PasskeyController();
