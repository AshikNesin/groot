import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import { AI, definePrompt } from "@groot/ai";

// Network-free tests: every case fails fast before any provider call.
describe("AIClient", () => {
  it("throws at construction for unknown catalog models", () => {
    expect(() => new AI({ provider: "openai", model: "nope-9000" })).toThrow(/Unknown model/);
  });

  it("withModel returns a client bound to the new model id", () => {
    const ai = new AI({ provider: "gw", model: "a", baseUrl: "https://example.com/v1" });
    expect(ai.withModel("b").model.id).toBe("b");
  });

  it("generateObject rejects non-object schemas before calling the provider", async () => {
    const ai = new AI({ provider: "gw", model: "a", baseUrl: "https://example.com/v1" });
    await expect(ai.generateObject({ prompt: "x", schema: z.string() })).rejects.toThrow(
      /ZodObject/,
    );
  });

  it("execute validates input before calling the provider", async () => {
    const prompt = definePrompt({
      name: "test",
      inputSchema: z.object({ q: z.string() }),
      outputSchema: z.object({ answer: z.string() }),
      getMessages: (input) => [{ role: "user", content: input.q }],
    });
    const ai = new AI({ provider: "gw", model: "a", baseUrl: "https://example.com/v1" });
    // @ts-expect-error intentionally invalid input
    await expect(ai.execute(prompt, { q: 42 })).rejects.toThrow();
  });
});
