import { z } from "zod";

/**
 * Schema for verifying passkey registration
 */
export const verifyRegistrationSchema = z.object({
  response: z.any(), // RegistrationResponseJSON from @simplewebauthn/types
  credentialName: z.string().min(1).max(100).optional(),
});

/**
 * Schema for verifying passkey authentication
 */
export const verifyAuthenticationSchema = z.object({
  response: z.any(), // AuthenticationResponseJSON from @simplewebauthn/types
  email: z.string().email().trim().toLowerCase().optional(),
});

/**
 * Schema for generating authentication options
 */
export const generateAuthenticationOptionsSchema = z.object({
  email: z.string().email().trim().toLowerCase().optional(),
});

/**
 * Schema for updating passkey name
 */
export const updatePasskeyNameSchema = z.object({
  credentialName: z
    .string()
    .min(1, "Passkey name must not be empty")
    .max(100, "Passkey name must be at most 100 characters"),
});

/**
 * Type definitions
 */
export type VerifyRegistrationDTO = z.infer<typeof verifyRegistrationSchema>;
export type VerifyAuthenticationDTO = z.infer<
  typeof verifyAuthenticationSchema
>;
export type GenerateAuthenticationOptionsDTO = z.infer<
  typeof generateAuthenticationOptionsSchema
>;
export type UpdatePasskeyNameDTO = z.infer<typeof updatePasskeyNameSchema>;
