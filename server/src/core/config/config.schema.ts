import { z } from "zod";

export const configSchema = z.object({
  app: z
    .object({
      name: z.string().default("Groot"),
      isProduction: z.boolean().default(false),
    })
    .default({}),
  cors: z
    .object({
      origins: z.array(z.string()).default([]),
    })
    .default({}),
  jobs: z
    .object({
      enabled: z.boolean().default(true),
      concurrency: z.number().int().min(1).default(5),
      pollInterval: z.number().int().min(500).default(2000),
      archiveCompletedAfterSeconds: z.number().int().min(0).default(3600),
      deleteArchivedAfterSeconds: z.number().int().min(0).default(86400),
      monitorStateInterval: z.number().int().min(0).default(60000),
    })
    .default({}),
  ai: z
    .object({
      defaultProvider: z.string().default("openai"),
      defaultModel: z.string().default("gpt-4o-mini"),
      enableStreaming: z.boolean().default(true),
      trackUsage: z.boolean().default(true),
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
      enableNotifications: z.boolean().default(false),
    })
    .default({}),
});

export type Config = z.infer<typeof configSchema>;
