import dayjs from "dayjs";
import { Boom } from "@/core/errors";
import { logger } from "@/core/logger";
import type { Passkey, User } from "@/generated/prisma/models";
import { passkeyModel } from "@/modules/passkey/passkey.model";
import { userModel } from "@/modules/auth/user.model";
import { generateToken } from "@/core/utils/jwt.utils";
import {
  generateDeviceName,
  generatePasskeyAuthenticationOptions,
  generatePasskeyRegistrationOptions,
  serializeTransports,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
} from "@/modules/passkey/webauthn.utils";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";

// In-memory challenge store (in production, use Redis or similar)
// Key format: `reg:${userId}` for registration, `auth:${email}` for authentication
const challengeStore = new Map<string, string>();

export class PasskeyService {
  /**
   * Generate registration options for a new passkey
   */
  async generateRegistrationOptions(
    userId: number,
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    // Get user
    const user = await userModel.findById(userId);
    if (!user) {
      throw Boom.notFound("User not found");
    }

    // Get existing passkeys
    const existingPasskeys = await passkeyModel.findByUserId(userId);

    // Generate options
    const options = await generatePasskeyRegistrationOptions(user, existingPasskeys);

    // Store challenge for verification
    challengeStore.set(`reg:${userId}`, options.challenge);

    logger.debug({ userId, email: user.email }, "Generated passkey registration options");

    return options;
  }

  /**
   * Verify registration response and create passkey
   */
  async verifyRegistration(
    userId: number,
    response: RegistrationResponseJSON,
    credentialName?: string,
  ): Promise<Passkey> {
    // Get stored challenge
    const expectedChallenge = challengeStore.get(`reg:${userId}`);
    if (!expectedChallenge) {
      throw Boom.badRequest("Challenge not found or expired");
    }

    // Verify the registration response
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

    // credential.id is already a base64url string in v13
    const credentialIdBase64 = credential.id;
    const existingPasskey = await passkeyModel.findByCredentialId(credentialIdBase64);
    if (existingPasskey) {
      throw Boom.conflict("This passkey is already registered");
    }

    // Generate default name if not provided
    const defaultName =
      credentialName || generateDeviceName(response.authenticatorAttachment, credential.transports);

    // Create passkey in database
    // credential.publicKey is a Uint8Array in v13
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

    // Clean up challenge
    challengeStore.delete(`reg:${userId}`);

    logger.info(
      { userId, passkeyId: passkey.id, credentialName: defaultName },
      "Passkey registered successfully",
    );

    return passkey;
  }

  /**
   * Generate authentication options for passkey login
   */
  async generateAuthenticationOptions(
    email?: string,
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    let userPasskeys: Passkey[] = [];

    // If email is provided, get user's passkeys
    if (email) {
      const user = await userModel.findByEmail(email);
      if (user) {
        userPasskeys = await passkeyModel.findByUserId(user.id);
      }
    }

    // Generate options
    const options = await generatePasskeyAuthenticationOptions(userPasskeys);

    // Store challenge for verification
    const challengeKey = email ? `auth:${email}` : "auth:discoverable";
    challengeStore.set(challengeKey, options.challenge);

    logger.debug({ email }, "Generated passkey authentication options");

    return options;
  }

  /**
   * Verify authentication response and return JWT token
   */
  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    email?: string,
  ): Promise<{ token: string; user: Omit<User, "password"> }> {
    // Get stored challenge
    const challengeKey = email ? `auth:${email}` : "auth:discoverable";
    const expectedChallenge = challengeStore.get(challengeKey);
    if (!expectedChallenge) {
      throw Boom.badRequest("Challenge not found or expired");
    }

    // Find passkey by credential ID
    const credentialIdBase64 = Buffer.from(response.rawId, "base64url").toString("base64url");
    const passkey = await passkeyModel.findByCredentialId(credentialIdBase64);
    if (!passkey) {
      throw Boom.unauthorized("Passkey not found");
    }

    // Verify the authentication response
    const verification = await verifyPasskeyAuthentication(response, expectedChallenge, passkey);

    if (!verification.verified) {
      throw Boom.unauthorized("Passkey authentication verification failed");
    }

    // Get user
    const user = await userModel.findById(passkey.userId);
    if (!user) {
      throw Boom.unauthorized("User not found");
    }

    // Update passkey counter and last used date
    await passkeyModel.update(passkey.id, {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: dayjs().toDate(),
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Clean up challenge
    challengeStore.delete(challengeKey);

    logger.info(
      { userId: user.id, email: user.email, passkeyId: passkey.id },
      "User authenticated with passkey successfully",
    );

    // Return token and user (without password)
    const { password: _, ...userWithoutPassword } = user;
    return {
      token,
      user: userWithoutPassword,
    };
  }

  /**
   * List all passkeys for a user
   */
  async listPasskeys(userId: number): Promise<Omit<Passkey, "publicKey" | "credentialId">[]> {
    const passkeys = await passkeyModel.findByUserId(userId);

    // Remove sensitive data (public key and credential ID)
    // Convert BigInt counter to Number for JSON serialization
    return passkeys.map(({ publicKey: _, credentialId: __, counter, ...safePasskey }) => ({
      ...safePasskey,
      counter: Number(counter),
    }));
  }

  /**
   * Delete a passkey
   */
  async deletePasskey(passkeyId: number, userId: number): Promise<void> {
    // Verify ownership
    const passkey = await passkeyModel.findByIdAndUserId(passkeyId, userId);
    if (!passkey) {
      throw Boom.notFound("Passkey not found");
    }

    // Check if this is the last passkey
    const passkeyCount = await passkeyModel.countByUserId(userId);
    if (passkeyCount === 1) {
      throw Boom.badRequest("Cannot delete the last passkey. Please add another passkey first.");
    }

    await passkeyModel.deletePasskey(passkeyId);

    logger.info({ userId, passkeyId }, "Passkey deleted successfully");
  }

  /**
   * Update passkey name
   */
  async updatePasskeyName(
    passkeyId: number,
    userId: number,
    credentialName: string,
  ): Promise<Passkey> {
    // Verify ownership
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
}

// Export singleton instance
export const passkeyService = new PasskeyService();
