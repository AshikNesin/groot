import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import merge from "lodash.merge";
import jsYaml from "js-yaml";
import { env } from "@/core/env";
import { configSchema, type Config } from "@/core/config/config.schema";

const parseYaml = jsYaml.load;

const CONFIG_PATH = resolve(process.cwd(), "config.yml");
const LOCAL_CONFIG_PATH = resolve(process.cwd(), "config.local.yml");

let _config: Config | null = null;

export function loadConfig(): Config {
  if (_config) return _config;

  // 1. Parse config.yml
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(
      `config.yml not found at ${CONFIG_PATH}\nCopy config.example.yml to config.yml to get started.`,
    );
  }

  let raw: Record<string, unknown>;
  try {
    raw = parseYaml(readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse config.yml: ${message}`);
  }

  // 2. Deep merge: default ← active environment section
  const defaults = (raw.default ?? {}) as Record<string, unknown>;
  const envSection = (raw[env.NODE_ENV] ?? {}) as Record<string, unknown>;
  let merged = merge(defaults, envSection);

  // 3. Layer config.local.yml if it exists
  if (existsSync(LOCAL_CONFIG_PATH)) {
    try {
      const localRaw = parseYaml(readFileSync(LOCAL_CONFIG_PATH, "utf-8")) as Record<
        string,
        unknown
      >;
      const localDefaults = (localRaw.default ?? {}) as Record<string, unknown>;
      const localEnv = (localRaw[env.NODE_ENV] ?? {}) as Record<string, unknown>;
      const localMerged = merge(localDefaults, localEnv);
      merged = merge(merged, localMerged);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse config.local.yml: ${message}`);
    }
  }

  // 4. Resolve dynamic variables (${VAR}, ${VAR:-fallback})
  const resolved = resolveVariables(merged);

  // 5. Validate with Zod
  try {
    _config = configSchema.parse(resolved);
  } catch (err) {
    if (err instanceof Error && "errors" in err) {
      const zodErr = err as { errors: Array<{ path: (string | number)[]; message: string }> };
      const details = zodErr.errors
        .map((e) => `  config.${e.path.join(".")} — ${e.message}`)
        .join("\n");
      throw new Error(`Invalid config.yml:\n${details}`);
    }
    throw err;
  }

  return _config;
}

export function reloadConfig(): Config {
  _config = null;
  return loadConfig();
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
    for (const [k, v] of Object.entries(value)) {
      result[k] = resolveVariables(v);
    }
    return result;
  }
  return value;
}

function resolveString(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, expr: string) => {
    const [varName, fallback] = expr.split(":-");
    const envVal = process.env[varName.trim()];
    if (envVal !== undefined) return envVal;
    if (fallback !== undefined) return fallback.trim();
    // No fallback — return empty string; Zod validation will catch if required
    return "";
  });
}
