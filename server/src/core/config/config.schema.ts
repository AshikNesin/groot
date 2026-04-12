import { z } from "zod";

// z.coerce.boolean() treats "false" as true (Boolean("false") === true).
// This preprocessor handles string "true"/"false" correctly.
const bool = z.preprocess((val) => {
  if (typeof val === "string") return val === "true";
  return val;
}, z.boolean());

export const configSchema = z.object({
  app: z
    .object({
      name: z.string().default("Groot"),
      isProduction: bool.default(false),
      port: z.coerce.number().int().min(1).default(3000),
    })
    .default({}),
  cors: z
    .object({
      origins: z.array(z.string()).default([]),
    })
    .default({}),
  auth: z
    .object({
      jwtExpiresIn: z.string().default("30d"),
    })
    .default({}),
  jobs: z
    .object({
      enabled: bool.default(true),
      concurrency: z.coerce.number().int().min(1).default(5),
      pollIntervalSeconds: z.coerce.number().int().min(1).default(5),
      archiveCompletedAfterSeconds: z.coerce.number().int().min(0).default(604800),
      deleteArchivedAfterSeconds: z.coerce.number().int().min(0).default(2592000),
      monitorStateIntervalSeconds: z.coerce.number().int().min(0).default(60),
    })
    .default({}),
  ai: z
    .object({
      defaultProvider: z.string().default("anthropic"),
      defaultModel: z.string().default("claude-sonnet-4-6"),
      enableStreaming: bool.default(true),
      trackUsage: bool.default(true),
    })
    .default({}),
  logging: z
    .object({
      level: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
      format: z.enum(["json", "text"]).default("json"),
    })
    .default({}),
  passkey: z
    .object({
      rpName: z.string().default("Groot"),
      rpId: z.string().default("localhost"),
      origin: z.string().default("https://groot.localhost"),
    })
    .default({}),
  sentry: z
    .object({
      dsn: z.string().default(""),
    })
    .default({}),
  features: z
    .object({
      enableNotifications: bool.default(false),
    })
    .default({}),
});

export type Config = z.infer<typeof configSchema>;
