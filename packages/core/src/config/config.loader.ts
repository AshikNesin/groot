import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import mergeWith from "lodash.mergewith";
import { load as yamlLoad } from "js-yaml";
import { z, ZodError } from "zod";
import { env } from "@groot/core/env";
import { Boom } from "@groot/core/errors";
import { deepFreeze, replaceArrays } from "@groot/core/utils/object.utils";
import { configSchema } from "./config.schema";

const CONFIG_PATH = resolve(process.cwd(), "config.yml");
const LOCAL_CONFIG_PATH = resolve(process.cwd(), "config.local.yml");

/**
 * Load and validate config.yml.
 *
 * @param schema Optional Zod schema to validate against. Defaults to the core
 *   `configSchema` (so `loadConfig()` is unchanged). Pass an extended schema
 *   from app-owned code to declare app-specific config sections without
 *   forking this synced file: `loadConfig(extendedSchema)` returns the
 *   widened type and keeps `config.yml` as the single source of truth.
 */
export function loadConfig<T extends z.ZodTypeAny = typeof configSchema>(
  schema: T = configSchema as unknown as T,
): z.infer<T> {
  // 1. Parse config.yml
  if (!existsSync(CONFIG_PATH)) {
    throw Boom.internal(
      `config.yml not found at ${CONFIG_PATH}\nCopy config.example.yml to config.yml to get started.`,
    );
  }

  let raw: Record<string, unknown>;
  try {
    const parsed = yamlLoad(readFileSync(CONFIG_PATH, "utf-8"));
    if (parsed === undefined || parsed === null) {
      throw Boom.internal("config.yml is empty or contains no valid YAML");
    }
    raw = parsed as Record<string, unknown>;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("config.yml is empty")) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw Boom.internal(`Failed to parse config.yml: ${message}`);
  }

  // 2. Deep merge: default ← active environment section
  const defaults = (raw.default ?? {}) as Record<string, unknown>;
  const envSection = (raw[env.NODE_ENV] ?? {}) as Record<string, unknown>;
  let merged = mergeWith({ ...defaults }, envSection, replaceArrays);

  // 3. Layer config.local.yml if it exists
  if (existsSync(LOCAL_CONFIG_PATH)) {
    try {
      const localParsed = yamlLoad(readFileSync(LOCAL_CONFIG_PATH, "utf-8"));
      const localRaw = (localParsed ?? {}) as Record<string, unknown>;
      const localDefaults = (localRaw.default ?? {}) as Record<string, unknown>;
      const localEnv = (localRaw[env.NODE_ENV] ?? {}) as Record<string, unknown>;
      const localMerged = mergeWith({ ...localDefaults }, localEnv, replaceArrays);
      merged = mergeWith({ ...merged }, localMerged, replaceArrays);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw Boom.internal(`Failed to parse config.local.yml: ${message}`);
    }
  }

  // 4. Resolve dynamic variables ({{ env.VAR }})
  const resolved = resolveVariables(merged);

  // 5. Validate with Zod, freeze for immutability
  try {
    return deepFreeze(schema.parse(resolved));
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.issues
        .map((e) => `  config.${e.path.join(".")} — ${e.message}`)
        .join("\n");
      throw Boom.internal(`Invalid config.yml:\n${details}`);
    }
    throw err;
  }
}

function resolveVariables(value: unknown): unknown {
  if (typeof value === "string") {
    return resolveString(value);
  }
  if (Array.isArray(value)) {
    return value.map(resolveVariables);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = resolveVariables(v);
    }
    return result;
  }
  return value;
}

export function resolveString(value: string): string {
  return value.replace(/\{\{\s*env\.(\w+)\s*\}\}/g, (_, varName: string) => {
    const envVal = process.env[varName];
    if (envVal !== undefined) return envVal;
    throw Boom.internal(
      `Config references env var \`${varName}\` which is not set.\n` +
        `Add ${varName} to your .env file or .env.schema.`,
    );
  });
}
