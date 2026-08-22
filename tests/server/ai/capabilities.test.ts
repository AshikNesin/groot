import { describe, expect, it } from "vite-plus/test";
import { getModelCapabilities, maxReasoningEffort } from "@groot/ai";

describe("getModelCapabilities", () => {
  it("treats gemini/vertex, claude and gpt models as document+image capable", () => {
    for (const id of [
      "google-vertex-ai/google/gemini-3-flash-preview",
      "anthropic/claude-sonnet-4-6",
      "openai/gpt-4o",
    ]) {
      expect(getModelCapabilities(id)).toEqual({ nativeDocuments: true, nativeImages: true });
    }
  });

  it("treats known text-only models as incapable even behind a gateway prefix", () => {
    expect(getModelCapabilities("cline-pass/deepseek-v4-pro")).toEqual({
      nativeDocuments: false,
      nativeImages: false,
    });
  });

  it("treats cline-pass/kimi models as image-only", () => {
    expect(getModelCapabilities("custom-clinepass/cline-pass/kimi-k3")).toEqual({
      nativeDocuments: false,
      nativeImages: true,
    });
  });

  it("defaults unknown models to image-only", () => {
    expect(getModelCapabilities("some-brand-new-model")).toEqual({
      nativeDocuments: false,
      nativeImages: true,
    });
  });

  it("lets callers prepend custom rules", () => {
    const caps = getModelCapabilities("acme/doc-pro", [
      { test: /acme/, capabilities: { nativeDocuments: true, nativeImages: true } },
    ]);
    expect(caps.nativeDocuments).toBe(true);
  });
});

describe("maxReasoningEffort", () => {
  it('returns "max" for ClinePass kimi-k3 (its catalog lists low/high/max)', () => {
    expect(maxReasoningEffort("custom-clinepass/cline-pass/kimi-k3")).toBe("max");
  });

  it('returns "xhigh" for models whose catalog tops out at xhigh', () => {
    expect(maxReasoningEffort("cline-pass/glm-5.2")).toBe("xhigh");
    expect(maxReasoningEffort("cline-pass/deepseek-v4-pro")).toBe("xhigh");
    expect(maxReasoningEffort("cline-pass/qwen3.8-max")).toBe("xhigh");
  });

  it("returns undefined for models without effort control", () => {
    // kimi-k2.6 catalog: reasoningOptions: [] (always-thinking, no effort param)
    expect(maxReasoningEffort("custom-clinepass/cline-pass/kimi-k2.6")).toBeUndefined();
    expect(maxReasoningEffort("cline-pass/qwen3.7-max")).toBeUndefined();
    expect(maxReasoningEffort("cline-pass/minimax-m3")).toBeUndefined();
  });

  it('defaults to "high" for unknown models', () => {
    expect(maxReasoningEffort("google-vertex-ai/google/gemini-3-flash-preview")).toBe("high");
    expect(maxReasoningEffort("some-brand-new-model")).toBe("high");
  });

  it("prefers kimi-k3 over the kimi-k2 rule (first-match wins)", () => {
    expect(maxReasoningEffort("cline-pass/kimi-k3-fast")).toBe("max");
  });
});
