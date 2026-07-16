import dayjs from "dayjs";
import { Boom } from "@groot/core/errors";
import { logger } from "@groot/core/logger";
import type { Passkey, User } from "@groot/core/database";
import { prisma } from "@groot/core/database";
import { findUserById, findUserByEmail } from "@groot/core/auth/auth.service";
import { generateToken } from "@groot/core/utils/jwt.utils";
import { createNamespaceKv } from "@groot/core/kv";
import {
  generateDeviceName,
  generatePasskeyAuthenticationOptions,
  generatePasskeyRegistrationOptions,
  serializeTransports,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
} from "./webauthn.utils";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

// ── Passkey data access ────────────────────────────────────────────────────

type CreatePasskeyData = {
  userId: number;
  credentialId: string;
  publicKey: Uint8Array<ArrayBuffer>;
  counter: bigint;
  deviceType?: string | null;
  backedUp: boolean;
  transports: string;
  credentialName?: string | null;
};

type UpdatePasskeyData = {
  counter?: bigint;
  lastUsedAt?: Date;
  credentialName?: string;
};

export async function createPasskey(data: CreatePasskeyData): Promise<Passkey> {
  return prisma.passkey.create({ data });
}

export async function findPasskeyByCredentialId(credentialId: string): Promise<Passkey | null> {
  return prisma.passkey.findUnique({ where: { credentialId } });
}

export async function findPasskeysByUserId(userId: number): Promise<Passkey[]> {
  return prisma.passkey.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function updatePasskey(id: number, data: UpdatePasskeyData): Promise<Passkey> {
  return prisma.passkey.update({ where: { id }, data });
}

export async function deletePasskeyRecord(id: number): Promise<Passkey> {
  return prisma.passkey.delete({ where: { id } });
}

export async function countPasskeysByUserId(userId: number): Promise<number> {
  return prisma.passkey.count({ where: { userId } });
}

export async function findPasskeyByIdAndUserId(
  id: number,
  userId: number,
): Promise<Passkey | null> {
  return prisma.passkey.findFirst({ where: { id, userId } });
}

// ── Challenge store backed by KV with TTL ──────────────────────────────────

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const challengeKv = createNamespaceKv("passkey:challenge");

async function storeChallenge(challenge: string): Promise<void> {
  await challengeKv.set(challenge, challenge, CHALLENGE_TTL_MS);
}

async function getAndDeleteChallenge(challenge: string): Promise<string | null> {
  const now = Date.now();
  // SQLite uses `?` placeholders (not Postgres `$1`) and supports RETURNING
  // on DELETE since SQLite 3.35. better-sqlite3 returns rows synchronously,
  // but Prisma's $queryRawUnsafe normalises to an async array result.
  const result = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
    `DELETE FROM keyv WHERE key = ? RETURNING value`,
    `passkey:challenge:${challenge}`,
  );
  if (!result.length) return null;

  try {
    const parsed = JSON.parse(result[0].value);
    if (parsed.expires && parsed.expires <= now) return null;
  } catch {
    return null;
  }
  return challenge;
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
    if (Boom.isHttpError(error)) throw error;
    throw Boom.badRequest("Invalid WebAuthn response: malformed clientDataJSON");
  }
}

// ── Passkey service ───────────────────────────────────────────────────────

export async function generateRegistrationOptions({
  userId,
}: {
  userId: number;
}): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const user = await findUserById(userId);
  if (!user) {
    throw Boom.notFound("User not found");
  }

  const existingPasskeys = await findPasskeysByUserId(userId);
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
  const existingPasskey = await findPasskeyByCredentialId(credentialIdBase64);
  if (existingPasskey) {
    throw Boom.conflict("This passkey is already registered");
  }

  const defaultName =
    credentialName ||
    generateDeviceName(
      response.authenticatorAttachment,
      credential.transports ? (credential.transports as string[]) : undefined,
    );

  const publicKey = new Uint8Array(Buffer.from(credential.publicKey));

  const passkey = await createPasskey({
    userId,
    credentialId: credentialIdBase64,
    publicKey,
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
    const user = await findUserByEmail(email);
    if (user) {
      userPasskeys = await findPasskeysByUserId(user.id);
    }
  }

  const options = await generatePasskeyAuthenticationOptions(userPasskeys);

  await storeChallenge(options.challenge);

  logger.debug({ email }, "Generated passkey authentication options");

  return options;
}

export async function verifyAuthentication({
  response,
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
  const passkey = await findPasskeyByCredentialId(credentialIdBase64);
  if (!passkey) {
    throw Boom.unauthorized("Passkey not found");
  }

  const verification = await verifyPasskeyAuthentication(response, expectedChallenge, passkey);

  if (!verification.verified) {
    throw Boom.unauthorized("Passkey authentication verification failed");
  }

  const user = await findUserById(passkey.userId);
  if (!user) {
    throw Boom.unauthorized("User not found");
  }

  await updatePasskey(passkey.id, {
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

export async function listPasskeys({ userId }: { userId: number }): Promise<
  (Omit<Passkey, "publicKey" | "credentialId" | "counter"> & {
    counter: number;
  })[]
> {
  const passkeys = await findPasskeysByUserId(userId);

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
  const passkey = await findPasskeyByIdAndUserId(passkeyId, userId);
  if (!passkey) {
    throw Boom.notFound("Passkey not found");
  }

  const passkeyCount = await countPasskeysByUserId(userId);
  if (passkeyCount === 1) {
    throw Boom.badRequest("Cannot delete the last passkey. Please add another passkey first.");
  }

  await deletePasskeyRecord(passkeyId);

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
  const passkey = await findPasskeyByIdAndUserId(passkeyId, userId);
  if (!passkey) {
    throw Boom.notFound("Passkey not found");
  }

  const updatedPasskey = await updatePasskey(passkeyId, {
    credentialName,
  });

  logger.info({ userId, passkeyId, credentialName }, "Passkey name updated successfully");

  return updatedPasskey;
}
