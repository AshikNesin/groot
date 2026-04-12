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
    })
    .default({}),
  cors: z
    .object({
      origins: z.array(z.string()).default([]),
    })
    .default({}),
  jobs: z
    .object({
      enabled: bool.default(true),
      concurrency: z.coerce.number().int().min(1).default(5),
      pollInterval: z.coerce.number().int().min(500).default(2000),
      archiveCompletedAfterSeconds: z.coerce.number().int().min(0).default(3600),
      deleteArchivedAfterSeconds: z.coerce.number().int().min(0).default(86400),
      monitorStateInterval: z.coerce.number().int().min(0).default(60000),
    })
    .default({}),
  ai: z
    .object({
      defaultProvider: z.string().default("openai"),
      defaultModel: z.string().default("gpt-4o-mini"),
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
  features: z
    .object({
      enableNotifications: bool.default(false),
    })
    .default({}),
});

export type Config = z.infer<typeof configSchema>;
