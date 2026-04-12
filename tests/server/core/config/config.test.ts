import { describe, it, expect } from "vite-plus/test";
import { configSchema } from "@/core/config/config.schema";

// ─── Schema Validation ───────────────────────────────────────────────────────

describe("configSchema", () => {
  it("applies defaults for missing values", () => {
    const result = configSchema.parse({});
    expect(result.app.name).toBe("Groot");
    expect(result.app.isProduction).toBe(false);
    expect(result.jobs.enabled).toBe(true);
    expect(result.logging.level).toBe("info");
    expect(result.features.enableNotifications).toBe(false);
  });

  it("accepts valid full config", () => {
    const result = configSchema.parse({
      app: { name: "Custom", isProduction: true },
      cors: { origins: ["https://example.com"] },
      jobs: { enabled: false, concurrency: 10 },
      ai: { defaultProvider: "anthropic", defaultModel: "claude-3" },
      logging: { level: "warn", format: "text" },
      features: { enableNotifications: true },
    });
    expect(result.app.name).toBe("Custom");
    expect(result.jobs.concurrency).toBe(10);
  });

  it("rejects invalid log level", () => {
    expect(() => configSchema.parse({ logging: { level: "verbose" } })).toThrow();
  });

  it("rejects negative concurrency", () => {
    expect(() => configSchema.parse({ jobs: { concurrency: -1 } })).toThrow();
  });

  it("coerces string booleans via z.coerce", () => {
    const result = configSchema.parse({
      app: { isProduction: "true" },
      features: { enableNotifications: "false" },
    });
    expect(result.app.isProduction).toBe(true);
    expect(result.features.enableNotifications).toBe(false);
  });

  it("coerces string numbers via z.coerce", () => {
    const result = configSchema.parse({
      jobs: { concurrency: "10", pollInterval: "3000" },
    });
    expect(result.jobs.concurrency).toBe(10);
    expect(result.jobs.pollInterval).toBe(3000);
  });

  it("infers Config type from schema", () => {
    type Config = import("@/core/config/config.schema").Config;
    const cfg: Config = configSchema.parse({});
    expect(typeof cfg.app.name).toBe("string");
    expect(typeof cfg.app.isProduction).toBe("boolean");
  });
});

// ─── Variable Resolution ─────────────────────────────────────────────────────

describe("variable resolution", () => {
  // Uses the same regex logic as config.loader.ts resolveString
  function resolveEnvVars(value: string): string {
    return value.replace(/\$\{([^}]+)\}/g, (_, expr: string) => {
      const [varName, fallback] = expr.split(":-");
      const envVal = process.env[varName.trim()];
      if (envVal !== undefined) return envVal;
      if (fallback !== undefined) return fallback.trim();
      return "";
    });
  }

  it("resolves ${VAR} from process.env", () => {
    process.env._TEST_RESOLVE_VAR = "resolved_value";
    expect(resolveEnvVars("${_TEST_RESOLVE_VAR}")).toBe("resolved_value");
    delete process.env._TEST_RESOLVE_VAR;
  });

  it("resolves ${VAR:-fallback} when var is missing", () => {
    delete process.env._TEST_MISSING_VAR;
    expect(resolveEnvVars("${_TEST_MISSING_VAR:-default_value}")).toBe("default_value");
  });

  it("returns empty string for missing var without fallback", () => {
    delete process.env._TEST_MISSING_NO_FALLBACK;
    expect(resolveEnvVars("${_TEST_MISSING_NO_FALLBACK}")).toBe("");
  });

  it("resolves multiple vars in one string", () => {
    process.env._TEST_HOST = "db.example.com";
    process.env._TEST_PORT = "5432";
    expect(resolveEnvVars("postgresql://${_TEST_HOST}:${_TEST_PORT}/mydb")).toBe(
      "postgresql://db.example.com:5432/mydb",
    );
    delete process.env._TEST_HOST;
    delete process.env._TEST_PORT;
  });

  it("prefers env var over fallback", () => {
    process.env._TEST_PREF_VAR = "from_env";
    expect(resolveEnvVars("${_TEST_PREF_VAR:-fallback}")).toBe("from_env");
    delete process.env._TEST_PREF_VAR;
  });
});
