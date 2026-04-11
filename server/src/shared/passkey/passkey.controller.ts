import type { Request, Response } from "express";
import * as PasskeySystem from "@/shared/passkey/passkey.service";
import type {
  VerifyRegistrationDTO,
  VerifyAuthenticationDTO,
  UpdatePasskeyNameDTO,
  GenerateAuthenticationOptionsDTO,
} from "@/shared/passkey/passkey.validation";
import { Boom } from "@/core/errors";
import { parseId } from "@/core/utils/controller.utils";
import { env } from "@/core/env";
import { JWT_EXPIRES_IN_MS } from "@/core/utils/jwt.utils";

/**
 * Generate options for passkey registration
 */
export async function generateRegistrationOptions(req: Request) {
  const userId = req.user?.userId;
  if (!userId) {
    throw Boom.unauthorized("Authentication required");
  }
  return await PasskeySystem.generateRegistrationOptions({ userId });
}

/**
 * Verify passkey registration
 */
export async function verifyRegistration(req: Request) {
  const userId = req.user?.userId;
  if (!userId) {
    throw Boom.unauthorized("Authentication required");
  }
  const payload = req.body as VerifyRegistrationDTO;

  return await PasskeySystem.verifyRegistration({
    userId,
    response: payload.response,
    credentialName: payload.credentialName,
  });
}

/**
 * Generate options for passkey authentication
 */
export async function generateAuthenticationOptions(req: Request) {
  const body = req.body as GenerateAuthenticationOptionsDTO;
  return await PasskeySystem.generateAuthenticationOptions({ email: body?.email });
}

/**
 * Verify passkey authentication
 */
export async function verifyAuthentication(req: Request, res: Response) {
  const body = req.body as VerifyAuthenticationDTO;
  const result = await PasskeySystem.verifyAuthentication({
    email: body.email,
    response: body.response,
  });

  const isProduction = env.NODE_ENV === "production";
  res.cookie("token", result.token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: JWT_EXPIRES_IN_MS,
    path: "/",
  });

  return result;
}

/**
 * List all passkeys for the user
 */
export async function listPasskeys(req: Request) {
  const userId = req.user?.userId;
  if (!userId) {
    throw Boom.unauthorized("Authentication required");
  }
  return await PasskeySystem.listPasskeys({ userId });
}

/**
 * Delete a passkey (remove passkey)
 */
export async function deletePasskey(req: Request) {
  const userId = req.user?.userId;
  if (!userId) {
    throw Boom.unauthorized("Authentication required");
  }
  const passkeyId = parseId(req.params.id);

  return await PasskeySystem.deletePasskey({ userId, passkeyId });
}

/**
 * Update passkey name
 */
export async function updatePasskeyName(req: Request) {
  const userId = req.user?.userId;
  if (!userId) {
    throw Boom.unauthorized("Authentication required");
  }

  const passkeyId = parseId(req.params.id);
  const payload = req.body as UpdatePasskeyNameDTO;

  return await PasskeySystem.updatePasskeyName({
    userId,
    passkeyId,
    credentialName: payload.credentialName,
  });
}
