import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import mergeWith from "lodash.mergewith";
import jsYaml from "js-yaml";
import { ZodError } from "zod";
import { env } from "@/core/env";
import { configSchema, type Config } from "@/core/config/config.schema";

const CONFIG_PATH = resolve(process.cwd(), "config.yml");
const LOCAL_CONFIG_PATH = resolve(process.cwd(), "config.local.yml");

// Arrays replace (not concatenate), objects merge recursively
const replaceArrays = (_targetVal: unknown, sourceVal: unknown) => {
  if (Array.isArray(sourceVal)) return sourceVal;
  return undefined;
};

// Deep freeze for runtime immutability
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  Object.freeze(obj);
  for (const val of Object.values(obj as Record<string, unknown>)) deepFreeze(val);
  return obj;
}

export function loadConfig(): Config {
  // 1. Parse config.yml
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(
      `config.yml not found at ${CONFIG_PATH}\nCopy config.example.yml to config.yml to get started.`,
    );
  }

  let raw: Record<string, unknown>;
  try {
    const parsed = jsYaml.load(readFileSync(CONFIG_PATH, "utf-8"));
    if (parsed === undefined || parsed === null) {
      throw new Error("config.yml is empty or contains no valid YAML");
    }
    raw = parsed as Record<string, unknown>;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("config.yml is empty")) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse config.yml: ${message}`);
  }

  // 2. Deep merge: default ← active environment section
  const defaults = (raw.default ?? {}) as Record<string, unknown>;
  const envSection = (raw[env.NODE_ENV] ?? {}) as Record<string, unknown>;
  let merged = mergeWith({ ...defaults }, envSection, replaceArrays);

  // 3. Layer config.local.yml if it exists
  if (existsSync(LOCAL_CONFIG_PATH)) {
    try {
      const localParsed = jsYaml.load(readFileSync(LOCAL_CONFIG_PATH, "utf-8"));
      const localRaw = (localParsed ?? {}) as Record<string, unknown>;
      const localDefaults = (localRaw.default ?? {}) as Record<string, unknown>;
      const localEnv = (localRaw[env.NODE_ENV] ?? {}) as Record<string, unknown>;
      const localMerged = mergeWith({ ...localDefaults }, localEnv, replaceArrays);
      merged = mergeWith({ ...merged }, localMerged, replaceArrays);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse config.local.yml: ${message}`);
    }
  }

  // 4. Resolve dynamic variables (${VAR}, ${VAR:-fallback})
  const resolved = resolveVariables(merged);

  // 5. Validate with Zod, freeze for immutability
  try {
    return deepFreeze(configSchema.parse(resolved));
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.issues
        .map((e) => `  config.${e.path.join(".")} — ${e.message}`)
        .join("\n");
      throw new Error(`Invalid config.yml:\n${details}`);
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
  return value.replace(/\$\{([^}]+)\}/g, (_, expr: string) => {
    const idx = expr.indexOf(":-");
    const hasFallback = idx !== -1;
    const varName = (hasFallback ? expr.slice(0, idx) : expr).trim();
    const fallback = hasFallback ? expr.slice(idx + 2).trim() : undefined;

    const envVal = process.env[varName];
    if (envVal !== undefined) return envVal;
    if (fallback !== undefined) return fallback;
    // Bare ${VAR} with missing env var — throw so Zod defaults aren't silently bypassed
    throw new Error(
      `Config references missing env var \${${varName}} with no fallback.\n` +
        `Set ${varName} in your environment, or use \${${varName}:-fallback} to provide a default.`,
    );
  });
}
