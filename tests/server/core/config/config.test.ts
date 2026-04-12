import { describe, it, expect } from "vite-plus/test";
import { configSchema } from "@/core/config/config.schema";
import { resolveString } from "@/core/config/config.loader";

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

  it("rejects invalid boolean strings", () => {
    expect(() => configSchema.parse({ app: { isProduction: "yes" } })).toThrow();
    expect(() => configSchema.parse({ app: { isProduction: "maybe" } })).toThrow();
  });

  it("coerces string numbers via z.coerce", () => {
    const result = configSchema.parse({
      jobs: { concurrency: "10", pollIntervalSeconds: "3" },
    });
    expect(result.jobs.concurrency).toBe(10);
    expect(result.jobs.pollIntervalSeconds).toBe(3);
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
  it("resolves ${VAR} from process.env", () => {
    process.env._TEST_RESOLVE_VAR = "resolved_value";
    expect(resolveString("${_TEST_RESOLVE_VAR}")).toBe("resolved_value");
    delete process.env._TEST_RESOLVE_VAR;
  });

  it("resolves ${VAR:-fallback} when var is missing", () => {
    delete process.env._TEST_MISSING_VAR;
    expect(resolveString("${_TEST_MISSING_VAR:-default_value}")).toBe("default_value");
  });

  it("throws for missing bare ${VAR} without fallback", () => {
    delete process.env._TEST_MISSING_NO_FALLBACK;
    expect(() => resolveString("${_TEST_MISSING_NO_FALLBACK}")).toThrow(
      /missing env var.*_TEST_MISSING_NO_FALLBACK/,
    );
  });

  it("resolves ${VAR:-} to empty string when var is missing", () => {
    delete process.env._TEST_EMPTY_FALLBACK;
    expect(resolveString("${_TEST_EMPTY_FALLBACK:-}")).toBe("");
  });

  it("resolves multiple vars in one string", () => {
    process.env._TEST_HOST = "db.example.com";
    process.env._TEST_PORT = "5432";
    expect(resolveString("postgresql://${_TEST_HOST}:${_TEST_PORT}/mydb")).toBe(
      "postgresql://db.example.com:5432/mydb",
    );
    delete process.env._TEST_HOST;
    delete process.env._TEST_PORT;
  });

  it("prefers env var over fallback", () => {
    process.env._TEST_PREF_VAR = "from_env";
    expect(resolveString("${_TEST_PREF_VAR:-fallback}")).toBe("from_env");
    delete process.env._TEST_PREF_VAR;
  });

  it("preserves :- inside fallback values", () => {
    delete process.env._TEST_DB_URL;
    expect(resolveString("${_TEST_DB_URL:-postgres://host:-5432}")).toBe("postgres://host:-5432");
  });
});
