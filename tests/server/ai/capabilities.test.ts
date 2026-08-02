import { describe, expect, it } from "vite-plus/test";
import { getModelCapabilities } from "@groot/ai";

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
