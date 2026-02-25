import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

export const env = createEnv({
  // Specify server-side environment variables
  // These are validated at build time (or server start)
  // and will throw an error if not set correctly.
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(3000), // coerce to number, default to 3000
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL must be set"),

    JWT_SECRET: z
      .string()
      .min(32, "JWT secret must be at least 32 characters")
      .default("your-secret-key-change-in-production-min-32-chars"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    ADMIN_AUTH_KEY: z
      .string()
      .min(1, "Admin auth key cannot be empty")
      .default("change-this-in-production"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    RP_NAME: z.string().default("Express React Boilerplate"),
    RP_ID: z.string().default("localhost"),
    ORIGIN: z.string().default("http://localhost:3000"),
    AWS_ACCESS_KEY_ID: z
      .string()
      .min(1, "AWS access key is required")
      .default("localstack"),
    AWS_SECRET_ACCESS_KEY: z
      .string()
      .min(1, "AWS secret key is required")
      .default("localstack"),
    AWS_DEFAULT_REGION: z.string().min(1).default("us-east-1"),
    AWS_DEFAULT_S3_BUCKET: z.string().min(1).default("local-bucket"),
    SENTRY_DSN: z.string().url("Sentry DSN must be a valid URL").optional(),
    SENTRY_RELEASE: z.string().optional(),
    JOB_CONCURRENCY: z.coerce.number().default(5),
    JOB_POLL_INTERVAL: z.coerce.number().default(5),
    JOB_ARCHIVE_COMPLETED_AFTER_SECONDS: z.coerce
      .number()
      .default(60 * 60 * 24 * 7),
    JOB_DELETE_ARCHIVED_AFTER_SECONDS: z.coerce
      .number()
      .default(60 * 60 * 24 * 30),
    JOB_MONITOR_STATE_INTERVAL: z.coerce.number().default(60),
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
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    ADMIN_AUTH_KEY: process.env.ADMIN_AUTH_KEY,
    LOG_LEVEL: process.env.LOG_LEVEL,
    RP_NAME: process.env.RP_NAME,
    RP_ID: process.env.RP_ID,
    ORIGIN: process.env.ORIGIN,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION,
    AWS_DEFAULT_S3_BUCKET: process.env.AWS_DEFAULT_S3_BUCKET,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_RELEASE: process.env.SENTRY_RELEASE,
    JOB_CONCURRENCY: process.env.JOB_CONCURRENCY,
    JOB_POLL_INTERVAL: process.env.JOB_POLL_INTERVAL,
    JOB_ARCHIVE_COMPLETED_AFTER_SECONDS:
      process.env.JOB_ARCHIVE_COMPLETED_AFTER_SECONDS,
    JOB_DELETE_ARCHIVED_AFTER_SECONDS:
      process.env.JOB_DELETE_ARCHIVED_AFTER_SECONDS,
    JOB_MONITOR_STATE_INTERVAL: process.env.JOB_MONITOR_STATE_INTERVAL,
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
