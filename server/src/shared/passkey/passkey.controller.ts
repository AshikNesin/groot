import { ResponseHandler } from "@/core/response-handler";
import * as PasskeySystem from "./passkey.service";
import { Boom } from "@/core/errors";
import type { Request, Response } from "express";
import { env } from "@/core/env";
import { parseId } from "@/core/utils/controller.utils";

export async function generateRegistrationOptions(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw Boom.unauthorized("Not authenticated");
  }

  const options = await PasskeySystem.generateRegistrationOptions({ userId: req.user.userId });

  ResponseHandler.success(res, options, "Registration options generated successfully");
}

export async function verifyRegistration(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw Boom.unauthorized("Not authenticated");
  }

  const { response, credentialName } = req.body;

  const passkey = await PasskeySystem.verifyRegistration({
    userId: req.user.userId,
    response,
    credentialName,
  });

  ResponseHandler.created(
    res,
    {
      id: passkey.id,
      credentialName: passkey.credentialName,
      createdAt: passkey.createdAt,
    },
    "Passkey registered successfully",
  );
}

export async function generateAuthenticationOptions(req: Request, res: Response): Promise<void> {
  const { email } = req.body;

  const options = await PasskeySystem.generateAuthenticationOptions({ email });

  ResponseHandler.success(res, options, "Authentication options generated successfully");
}

export async function verifyAuthentication(req: Request, res: Response): Promise<void> {
  const { response, email } = req.body;

  const { token, user } = await PasskeySystem.verifyAuthentication({ response, email });

  res.cookie("token", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  ResponseHandler.success(res, { token, user }, "Authentication successful");
}

export async function listPasskeys(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw Boom.unauthorized("Not authenticated");
  }

  const passkeys = await PasskeySystem.listPasskeys({ userId: req.user.userId });

  ResponseHandler.success(res, passkeys);
}

export async function deletePasskey(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw Boom.unauthorized("Not authenticated");
  }

  const passkeyId = parseId(req.params.id, "Passkey ID");

  await PasskeySystem.deletePasskey({ passkeyId, userId: req.user.userId });

  ResponseHandler.success(res, null, "Passkey deleted successfully");
}

export async function updatePasskeyName(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw Boom.unauthorized("Not authenticated");
  }

  const passkeyId = parseId(req.params.id, "Passkey ID");
  const { credentialName } = req.body;

  const updatedPasskey = await PasskeySystem.updatePasskeyName({
    passkeyId,
    userId: req.user.userId,
    credentialName,
  });

  ResponseHandler.success(
    res,
    {
      id: updatedPasskey.id,
      credentialName: updatedPasskey.credentialName,
    },
    "Passkey name updated successfully",
  );
}
