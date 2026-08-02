import { describe, expect, it } from "vite-plus/test";
import { resolveModel } from "@groot/ai";

describe("resolveModel", () => {
  it("resolves catalog models", () => {
    const model = resolveModel({ provider: "openai", model: "gpt-4o" });
    expect(model.id).toBe("gpt-4o");
    expect(model.provider).toBe("openai");
    expect(model.baseUrl).toContain("openai.com");
  });

  it("throws a helpful error for unknown catalog models", () => {
    expect(() => resolveModel({ provider: "openai", model: "nope-9000" })).toThrow(/Unknown model/);
  });

  it("builds an OpenAI-compatible model for custom endpoints", () => {
    const model = resolveModel({
      provider: "cloudflare-gateway",
      model: "google/gemini-3-flash-preview",
      baseUrl: "https://gateway.ai.cloudflare.com/v1/acct/gw/compat",
      headers: { "cf-aig-authorization": "Bearer test" },
      reasoning: true,
    });
    expect(model).toMatchObject({
      id: "google/gemini-3-flash-preview",
      api: "openai-completions",
      provider: "cloudflare-gateway",
      baseUrl: "https://gateway.ai.cloudflare.com/v1/acct/gw/compat",
      reasoning: true,
      input: ["text", "image"],
      headers: { "cf-aig-authorization": "Bearer test" },
    });
  });

  it("reuses the same endpoint with a different model id", () => {
    const config = { provider: "gw", model: "a", baseUrl: "https://example.com/v1" };
    expect(resolveModel(config, "b").id).toBe("b");
  });
});
