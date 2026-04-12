import {
  type GenerateAuthenticationOptionsOpts,
  type GenerateRegistrationOptionsOpts,
  type VerifyAuthenticationResponseOpts,
  type VerifyRegistrationResponseOpts,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { env } from "@/core/env";

// Configuration for WebAuthn
export const RP_NAME = env.RP_NAME;
export const RP_ID = env.RP_ID;
export const ORIGIN = env.ORIGIN;

/**
 * Interface for passkey data stored in database
 */
export interface PasskeyData {
  id: number;
  userId: number;
  credentialId: string;
  publicKey: Buffer;
  counter: bigint;
  deviceType: string | null;
  backedUp: boolean;
  transports: string[];
  credentialName: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate registration options for a new passkey
 */
export async function generatePasskeyRegistrationOptions(
  user: { id: number; email: string },
  existingCredentials: PasskeyData[] = [],
) {
  const opts: GenerateRegistrationOptionsOpts = {
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.email,
    userDisplayName: user.email,
    // Exclude credentials the user already has
    excludeCredentials: existingCredentials.map((passkey) => ({
      id: passkey.credentialId,
      type: "public-key",
      transports: passkey.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
    attestationType: "none",
  };

  return await generateRegistrationOptions(opts);
}

/**
 * Verify passkey registration response
 */
export async function verifyPasskeyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string,
) {
  const opts: VerifyRegistrationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  };

  return await verifyRegistrationResponse(opts);
}

/**
 * Generate authentication options for passkey login
 */
export async function generatePasskeyAuthenticationOptions(userPasskeys: PasskeyData[] = []) {
  const opts: GenerateAuthenticationOptionsOpts = {
    rpID: RP_ID,
    // Allow credentials from all user's passkeys
    allowCredentials: userPasskeys.map((passkey) => ({
      id: passkey.credentialId,
      type: "public-key",
      transports: passkey.transports as AuthenticatorTransportFuture[],
    })),
    userVerification: "preferred",
  };

  return await generateAuthenticationOptions(opts);
}

/**
 * Verify passkey authentication response
 */
export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  passkey: PasskeyData,
) {
  const opts: VerifyAuthenticationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: passkey.credentialId,
      publicKey: passkey.publicKey,
      counter: Number(passkey.counter),
    },
  };

  return await verifyAuthenticationResponse(opts);
}

/**
 * Convert authenticator transports to database format
 */
export function serializeTransports(transports?: AuthenticatorTransportFuture[]): string[] {
  return transports || [];
}

/**
 * Generate a user-friendly device name based on authenticator info
 */
export function generateDeviceName(
  authenticatorAttachment?: "platform" | "cross-platform",
  transports?: string[],
): string {
  if (authenticatorAttachment === "platform") {
    return "This device";
  }

  if (transports?.includes("usb")) {
    return "Security key (USB)";
  }

  if (transports?.includes("nfc")) {
    return "Security key (NFC)";
  }

  if (transports?.includes("ble")) {
    return "Security key (Bluetooth)";
  }

  return "Security key";
}
