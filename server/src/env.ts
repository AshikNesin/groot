import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

export const env = createEnv({
  // Specify server-side environment variables
  // These are validated at build time (or server start)
  // and will throw an error if not set correctly.
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(3000), // coerce to number, default to 3000
    DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string"),
    BASIC_AUTH_USERNAME: z
      .string()
      .min(1, "Basic auth username cannot be empty"),
    BASIC_AUTH_PASSWORD: z
      .string()
      .min(1, "Basic auth password cannot be empty"),
    SENTRY_DSN: z
      .string()
      .url("Sentry DSN must be a valid URL")
      .optional(),
    // NODE_ENV: z.enum(["development", "production", "test"]).default("development"), // Optional: if you use NODE_ENV
  },

  // Environment variables available on the client (and server).
  // For backend-only, this might be empty or not used.
  // client: {
  //   NEXT_PUBLIC_SOME_KEY: z.string().min(1),
  // },

  // Due to how some bundlers/frameworks handle env vars,
  // often you need to manually destructure them here.
  // For a simple Node.js/Express app, this maps directly from process.env.
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    BASIC_AUTH_USERNAME: process.env.BASIC_AUTH_USERNAME,
    BASIC_AUTH_PASSWORD: process.env.BASIC_AUTH_PASSWORD,
    SENTRY_DSN: process.env.SENTRY_DSN,
    // NODE_ENV: process.env.NODE_ENV, // Optional
  },

  /**
   * By default, t3-env will filter out any environment variables that are not defined
   * in server or client. This is generally good for security, but can be disabled if needed.
   * skipValidation: !!process.env.SKIP_ENV_VALIDATION,
   */

  /**
   * Makes it so that empty strings are treated as undefined.
   * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
