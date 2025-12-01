import { apiClient } from "@/lib/api";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";

interface Passkey {
  id: number;
  userId: number;
  deviceType: string | null;
  backedUp: boolean;
  transports: string[];
  credentialName: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  id: number;
  email: string;
  name?: string;
}

class PasskeyService {
  /**
   * Register a new passkey for the authenticated user
   */
  async registerPasskey(credentialName?: string): Promise<Passkey> {
    try {
      // 1. Get registration options from server
      const options = await apiClient.post<
        PublicKeyCredentialCreationOptionsJSON
      >("/passkey/register/options");

      if (!options) {
        throw new Error("Failed to get registration options");
      }

      // 2. Start WebAuthn registration
      const registrationResponse: RegistrationResponseJSON =
        await startRegistration(options);

      // 3. Verify registration with server
      const passkey = await apiClient.post<Passkey>(
        "/passkey/register/verify",
        {
          response: registrationResponse,
          credentialName,
        },
      );

      if (!passkey) {
        throw new Error("Failed to verify registration");
      }

      return passkey;
    } catch (error: any) {
      if (error.name === "NotAllowedError") {
        throw new Error(
          "Passkey registration was cancelled or not allowed. Please try again.",
        );
      }
      if (error.name === "NotSupportedError") {
        throw new Error(
          "Passkeys are not supported in this browser. Please use a modern browser that supports WebAuthn.",
        );
      }
      throw error;
    }
  }

  /**
   * Authenticate using a passkey
   */
  async loginWithPasskey(
    email?: string,
  ): Promise<{ token: string; user: User }> {
    try {
      // 1. Get authentication options from server
      const options = await apiClient.post<
        PublicKeyCredentialRequestOptionsJSON
      >("/passkey/login/options", {
        email,
      });

      if (!options) {
        throw new Error("Failed to get authentication options");
      }

      // 2. Start WebAuthn authentication
      const authenticationResponse: AuthenticationResponseJSON =
        await startAuthentication(options);

      // 3. Verify authentication with server
      const result = await apiClient.post<{ token: string; user: User }>(
        "/passkey/login/verify",
        {
          response: authenticationResponse,
          email,
        },
      );

      if (!result) {
        throw new Error("Failed to verify authentication");
      }

      return result;
    } catch (error: any) {
      if (error.name === "NotAllowedError") {
        throw new Error(
          "Passkey authentication was cancelled or not allowed. Please try again.",
        );
      }
      if (error.name === "NotSupportedError") {
        throw new Error(
          "Passkeys are not supported in this browser. Please use a modern browser that supports WebAuthn.",
        );
      }
      throw error;
    }
  }

  /**
   * List all passkeys for the authenticated user
   */
  async listPasskeys(): Promise<Passkey[]> {
    const passkeys = await apiClient.get<Passkey[]>("/passkey/list");
    return passkeys || [];
  }

  /**
   * Delete a passkey
   */
  async deletePasskey(passkeyId: number): Promise<void> {
    await apiClient.delete(`/passkey/${passkeyId}`);
  }

  /**
   * Update passkey name
   */
  async updatePasskeyName(
    passkeyId: number,
    credentialName: string,
  ): Promise<Passkey> {
    const passkey = await apiClient.patch<Passkey>(
      `/passkey/${passkeyId}`,
      {
        credentialName,
      },
    );

    if (!passkey) {
      throw new Error("Failed to update passkey name");
    }

    return passkey;
  }

  /**
   * Check if passkeys are supported in the current browser
   */
  isPasskeySupported(): boolean {
    return (
      typeof window !== "undefined" &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
        "function"
    );
  }

  /**
   * Check if platform authenticator (e.g., Face ID, Touch ID, Windows Hello) is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isPasskeySupported()) {
      return false;
    }

    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const passkeyService = new PasskeyService();
export type { Passkey };
