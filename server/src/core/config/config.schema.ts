import { z } from "zod";

// z.coerce.boolean() treats "false" as true (Boolean("false") === true).
// This preprocessor handles string "true"/"false" correctly and rejects
// other strings (e.g. "maybe", "yes") instead of silently coercing to false.
const bool = z.preprocess((val) => {
  if (typeof val === "string") {
    if (val === "true") return true;
    if (val === "false") return false;
    return val; // Pass through to let z.boolean() reject it
  }
  return val;
}, z.boolean());

export const configSchema = z.object({
  app: z
    .object({
      name: z.string().default("Groot"),
      isProduction: bool.default(false),
      port: z.preprocess((val) => {
        // Prefer PORT env var (set by hosting platforms like Coolify)
        const envPort = process.env.PORT;
        if (envPort !== undefined && envPort !== "") return Number(envPort);
        if (typeof val === "number") return val;
        return undefined; // let .default(3000) kick in
      }, z.number().int().min(1).default(3000)),
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
  rateLimits: z
    .object({
      storage: z
        .object({
          windowMs: z.coerce.number().int().positive().default(900000),
          max: z.coerce.number().int().positive().default(100),
        })
        .default({}),
      upload: z
        .object({
          windowMs: z.coerce.number().int().positive().default(900000),
          max: z.coerce.number().int().positive().default(50),
        })
        .default({}),
      publicFile: z
        .object({
          windowMs: z.coerce.number().int().positive().default(900000),
          max: z.coerce.number().int().positive().default(200),
        })
        .default({}),
      ai: z
        .object({
          windowMs: z.coerce.number().int().positive().default(3600000),
          max: z.coerce.number().int().positive().default(100),
        })
        .default({}),
      aiStream: z
        .object({
          windowMs: z.coerce.number().int().positive().default(3600000),
          max: z.coerce.number().int().positive().default(50),
        })
        .default({}),
    })
    .default({}),
});

export type Config = z.infer<typeof configSchema>;
