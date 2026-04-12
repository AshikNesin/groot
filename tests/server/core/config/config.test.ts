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
  it("resolves {{ env.VAR }} from env", () => {
    process.env._TEST_RESOLVE_VAR = "resolved_value";
    expect(resolveString("{{ env._TEST_RESOLVE_VAR }}")).toBe("resolved_value");
    delete process.env._TEST_RESOLVE_VAR;
  });

  it("throws for missing {{ env.VAR }}", () => {
    delete process.env._TEST_MISSING_NO_FALLBACK;
    expect(() => resolveString("{{ env._TEST_MISSING_NO_FALLBACK }}")).toThrow(
      /_TEST_MISSING_NO_FALLBACK/,
    );
  });

  it("resolves multiple vars in one string", () => {
    process.env._TEST_HOST = "db.example.com";
    process.env._TEST_PORT = "5432";
    expect(resolveString("postgresql://{{ env._TEST_HOST }}:{{ env._TEST_PORT }}/mydb")).toBe(
      "postgresql://db.example.com:5432/mydb",
    );
    delete process.env._TEST_HOST;
    delete process.env._TEST_PORT;
  });

  it("ignores whitespace inside {{ }}", () => {
    process.env._TEST_WS_VAR = "value";
    expect(resolveString("{{env._TEST_WS_VAR}}")).toBe("value");
    delete process.env._TEST_WS_VAR;
  });
});
