import { z } from "zod";

/**
 * Wrap an object schema so an absent section coerces to `{}` *before* parsing.
 *
 * Two zod-4 changes make the obvious replacements break:
 *  - `.default({})` short-circuits on `undefined` and returns the bare `{}`
 *    literal, skipping the inner field defaults.
 *  - `.pipe()` wrappers (the documented `z.preprocess` replacement) drop
 *    object-field optionality, so an absent key is rejected as "nonoptional".
 *
 * `z.preprocess` (deprecated but still functional in zod 4) is the one idiom
 * that both keeps the field optional and lets the inner schema apply its field
 * defaults when the section is absent — restoring the zod-3 behavior.
 */
function section<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => v ?? {}, schema);
}

// z.coerce.boolean() treats "false" as true (Boolean("false") === true).
// This preprocessor handles string "true"/"false" correctly and rejects other
// strings (e.g. "maybe", "yes") instead of silently coercing to false.
const bool = z.preprocess((val) => {
  if (typeof val === "string") {
    if (val === "true") return true;
    if (val === "false") return false;
    return val; // Pass through to let z.boolean() reject it
  }
  return val;
}, z.boolean());

export const configSchema = z.object({
  app: section(
    z.object({
      name: z.string().default("Groot"),
      isProduction: bool.default(false),
      port: z.preprocess((val) => {
        // Prefer PORT env var (set by hosting platforms like Coolify)
        const envPort = process.env.PORT;
        if (envPort !== undefined && envPort !== "") return Number(envPort);
        if (typeof val === "number") return val;
        return undefined; // let .default(3000) kick in
      }, z.number().int().min(1).default(3000)),
    }),
  ),
  cors: section(
    z.object({
      origins: z.array(z.string()).default([]),
    }),
  ),
  auth: section(
    z.object({
      jwtExpiresIn: z.string().default("30d"),
    }),
  ),
  jobs: section(
    z.object({
      enabled: bool.default(true),
      concurrency: z.coerce.number().int().min(1).default(5),
      pollIntervalSeconds: z.coerce.number().int().min(1).default(5),
      archiveCompletedAfterSeconds: z.coerce.number().int().min(0).default(604800),
      deleteArchivedAfterSeconds: z.coerce.number().int().min(0).default(2592000),
      monitorStateIntervalSeconds: z.coerce.number().int().min(0).default(60),
    }),
  ),
  logging: section(
    z.object({
      level: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
      format: z.enum(["json", "text"]).default("json"),
    }),
  ),
  passkey: section(
    z.object({
      rpName: z.string().default("Groot"),
      rpId: z.string().default("localhost"),
      origin: z.string().default("https://groot.localhost"),
    }),
  ),
  sentry: section(
    z.object({
      dsn: z.string().default(""),
    }),
  ),
  rateLimits: section(
    z.object({
      storage: section(
        z.object({
          windowMs: z.coerce.number().int().positive().default(900000),
          max: z.coerce.number().int().positive().default(100),
        }),
      ),
      upload: section(
        z.object({
          windowMs: z.coerce.number().int().positive().default(900000),
          max: z.coerce.number().int().positive().default(50),
        }),
      ),
    }),
  ),
});

export type Config = z.infer<typeof configSchema>;
