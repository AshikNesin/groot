import { z } from "zod";

// Shared field shapes — composed by the auth schemas below. These are pure
// Zod (no server-only imports) so the client can reuse them for form
// validation (single source of truth).
const emailField = z.email("Invalid email address");
const passwordField = z.string().min(6, "Password must be at least 6 characters");

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: emailField,
  password: passwordField,
});

export type LoginDTO = z.infer<typeof loginSchema>;

/**
 * Create user schema (admin only)
 */
export const createUserSchema = z.object({
  email: emailField,
  password: passwordField,
  name: z.string().min(1, "Name is required").optional(),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>;
