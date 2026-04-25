import dayjs from "dayjs";
import { Boom } from "@/core/errors";
import { logger } from "@/core/logger";
import type { Passkey, User } from "@/generated/prisma/models";
import { passkeyModel } from "@/shared/passkey/passkey.model";
import { userModel } from "@/shared/auth/user.model";
import { generateToken } from "@/core/utils/jwt.utils";
import { createNamespaceKv } from "@/core/kv";
import { prisma } from "@/core/database";
import {
  generateDeviceName,
  generatePasskeyAuthenticationOptions,
  generatePasskeyRegistrationOptions,
  serializeTransports,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
} from "@/shared/passkey/webauthn.utils";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";

// ── Challenge store backed by KV with TTL ──────────────────────────────────

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const challengeKv = createNamespaceKv("passkey:challenge");

async function storeChallenge(challenge: string): Promise<void> {
  await challengeKv.set(challenge, challenge, CHALLENGE_TTL_MS);
}

async function getAndDeleteChallenge(challenge: string): Promise<string | null> {
  const result = await prisma.$queryRawUnsafe<Array<{ key: string }>>(
    `DELETE FROM keyv WHERE key = $1 RETURNING key`,
    `passkey:challenge:${challenge}`,
  );
  return result.length ? challenge : null;
}

function extractChallengeFromResponse(response: { response: { clientDataJSON: string } }): string {
  try {
    const clientData = JSON.parse(
      Buffer.from(response.response.clientDataJSON, "base64url").toString("utf-8"),
    );
    if (!clientData.challenge) {
      throw Boom.badRequest("Missing challenge in WebAuthn response");
    }
    return clientData.challenge;
  } catch (error) {
    if (error instanceof Boom) throw error;
    throw Boom.badRequest("Invalid WebAuthn response: malformed clientDataJSON");
  }
}

// ── Passkey service ───────────────────────────────────────────────────────

export async function generateRegistrationOptions({
  userId,
}: {
  userId: number;
}): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const user = await userModel.findById(userId);
  if (!user) {
    throw Boom.notFound("User not found");
  }

  const existingPasskeys = await passkeyModel.findByUserId(userId);
  const options = await generatePasskeyRegistrationOptions(user, existingPasskeys);

  await storeChallenge(options.challenge);
  logger.debug({ userId, email: user.email }, "Generated passkey registration options");

  return options;
}

export async function verifyRegistration({
  userId,
  response,
  credentialName,
}: {
  userId: number;
  response: RegistrationResponseJSON;
  credentialName?: string;
}): Promise<Passkey> {
  const challengeFromResponse = extractChallengeFromResponse(response);
  const expectedChallenge = await getAndDeleteChallenge(challengeFromResponse);
  if (!expectedChallenge) {
    throw Boom.badRequest("Challenge not found or expired");
  }

  const verification = await verifyPasskeyRegistration(response, expectedChallenge);
  if (!verification.verified || !verification.registrationInfo) {
    throw Boom.badRequest("Passkey registration verification failed");
  }

  const { registrationInfo } = verification;
  const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;

  if (!credential?.id) {
    throw Boom.badRequest("Missing credential ID in registration info");
  }
  if (!credential?.publicKey) {
    throw Boom.badRequest("Missing public key in registration info");
  }

  const credentialIdBase64 = credential.id;
  const existingPasskey = await passkeyModel.findByCredentialId(credentialIdBase64);
  if (existingPasskey) {
    throw Boom.conflict("This passkey is already registered");
  }

  const defaultName =
    credentialName || generateDeviceName(response.authenticatorAttachment, credential.transports);

  const publicKeyBuffer = Buffer.from(credential.publicKey);

  const passkey = await passkeyModel.create({
    userId,
    credentialId: credentialIdBase64,
    publicKey: publicKeyBuffer,
    counter: BigInt(credential.counter ?? 0),
    deviceType: credentialDeviceType || null,
    backedUp: !!credentialBackedUp,
    transports: serializeTransports(credential.transports),
    credentialName: defaultName,
  });

  logger.info(
    { userId, passkeyId: passkey.id, credentialName: defaultName },
    "Passkey registered successfully",
  );

  return passkey;
}

export async function generateAuthenticationOptions({
  email,
}: { email?: string } = {}): Promise<PublicKeyCredentialRequestOptionsJSON> {
  let userPasskeys: Passkey[] = [];

  if (email) {
    const user = await userModel.findByEmail(email);
    if (user) {
      userPasskeys = await passkeyModel.findByUserId(user.id);
    }
  }

  const options = await generatePasskeyAuthenticationOptions(userPasskeys);

  await storeChallenge(options.challenge);

  logger.debug({ email }, "Generated passkey authentication options");

  return options;
}

export async function verifyAuthentication({
  response,
  email,
}: {
  response: AuthenticationResponseJSON;
  email?: string;
}): Promise<{ token: string; user: Omit<User, "password"> }> {
  const challengeFromResponse = extractChallengeFromResponse(response);
  const expectedChallenge = await getAndDeleteChallenge(challengeFromResponse);
  if (!expectedChallenge) {
    throw Boom.badRequest("Challenge not found or expired");
  }

  const credentialIdBase64 = Buffer.from(response.rawId, "base64url").toString("base64url");
  const passkey = await passkeyModel.findByCredentialId(credentialIdBase64);
  if (!passkey) {
    throw Boom.unauthorized("Passkey not found");
  }

  const verification = await verifyPasskeyAuthentication(response, expectedChallenge, passkey);

  if (!verification.verified) {
    throw Boom.unauthorized("Passkey authentication verification failed");
  }

  const user = await userModel.findById(passkey.userId);
  if (!user) {
    throw Boom.unauthorized("User not found");
  }

  await passkeyModel.update(passkey.id, {
    counter: BigInt(verification.authenticationInfo.newCounter),
    lastUsedAt: dayjs().toDate(),
  });

  const token = generateToken({
    userId: user.id,
    email: user.email,
  });

  logger.info(
    { userId: user.id, email: user.email, passkeyId: passkey.id },
    "User authenticated with passkey successfully",
  );

  const { password: _, ...userWithoutPassword } = user;
  return {
    token,
    user: userWithoutPassword,
  };
}

export async function listPasskeys({
  userId,
}: {
  userId: number;
}): Promise<Omit<Passkey, "publicKey" | "credentialId">[]> {
  const passkeys = await passkeyModel.findByUserId(userId);

  return passkeys.map(({ publicKey: _, credentialId: __, counter, ...safePasskey }) => ({
    ...safePasskey,
    counter: Number(counter),
  }));
}

export async function deletePasskey({
  passkeyId,
  userId,
}: {
  passkeyId: number;
  userId: number;
}): Promise<void> {
  const passkey = await passkeyModel.findByIdAndUserId(passkeyId, userId);
  if (!passkey) {
    throw Boom.notFound("Passkey not found");
  }

  const passkeyCount = await passkeyModel.countByUserId(userId);
  if (passkeyCount === 1) {
    throw Boom.badRequest("Cannot delete the last passkey. Please add another passkey first.");
  }

  await passkeyModel.deletePasskey(passkeyId);

  logger.info({ userId, passkeyId }, "Passkey deleted successfully");
}

export async function updatePasskeyName({
  passkeyId,
  userId,
  credentialName,
}: {
  passkeyId: number;
  userId: number;
  credentialName: string;
}): Promise<Passkey> {
  const passkey = await passkeyModel.findByIdAndUserId(passkeyId, userId);
  if (!passkey) {
    throw Boom.notFound("Passkey not found");
  }

  const updatedPasskey = await passkeyModel.update(passkeyId, {
    credentialName,
  });

  logger.info({ userId, passkeyId, credentialName }, "Passkey name updated successfully");

  return updatedPasskey;
}
