import type { Request } from "express";
import * as PasskeySystem from "./passkey.service";
import type { VerifyRegistrationDTO, VerifyAuthenticationDTO, UpdatePasskeyNameDTO, GenerateAuthenticationOptionsDTO } from "./passkey.validation";
import { Boom } from "@/core/errors";

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
  const payload = (req.validated?.body || req.body) as VerifyRegistrationDTO;

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
  const body = (req.validated?.body || req.body) as GenerateAuthenticationOptionsDTO;
  return await PasskeySystem.generateAuthenticationOptions({ email: body?.email });
}

/**
 * Verify passkey authentication
 */
export async function verifyAuthentication(req: Request) {
  const body = (req.validated?.body || req.body) as VerifyAuthenticationDTO;
  return await PasskeySystem.verifyAuthentication({
    email: body.email,
    response: body.response,
  });
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
  const passkeyId = Number(req.params.id);

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

  const passkeyId = Number(req.params.id);
  const payload = (req.validated?.body || req.body) as UpdatePasskeyNameDTO;

  return await PasskeySystem.updatePasskeyName({
    userId,
    passkeyId,
    credentialName: payload.credentialName,
  });
}
