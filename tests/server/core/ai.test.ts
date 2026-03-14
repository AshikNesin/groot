import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @mariozechner/pi-ai before importing the AI class
vi.mock("@mariozechner/pi-ai", () => {
  const mockModel = {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    api: "openai-responses",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0.15, output: 0.6, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 16384,
  };

  const mockAssistantMessage = {
    role: "assistant",
    content: [{ type: "text", text: "Hello from AI!" }],
    api: "openai-responses",
    provider: "openai",
    model: "gpt-4o-mini",
    usage: {
      input: 10,
      output: 5,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 15,
      cost: { input: 0.001, output: 0.002, cacheRead: 0, cacheWrite: 0, total: 0.003 },
    },
    stopReason: "stop",
    timestamp: Date.now(),
  };

  const mockToolCallMessage = {
    role: "assistant",
    content: [
      {
        type: "toolCall",
        id: "call_123",
        name: "extract_data",
        arguments: { name: "John", age: 30 },
      },
    ],
    api: "openai-responses",
    provider: "openai",
    model: "gpt-4o-mini",
    usage: {
      input: 20,
      output: 10,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 30,
      cost: { input: 0.001, output: 0.002, cacheRead: 0, cacheWrite: 0, total: 0.003 },
    },
    stopReason: "toolUse",
    timestamp: Date.now(),
  };

  // Create a mock event stream
  function createMockStream(events: any[]) {
    const stream = {
      [Symbol.asyncIterator]: async function* () {
        for (const event of events) {
          yield event;
        }
      },
      result: async () => mockAssistantMessage,
    };
    return stream;
  }

  return {
    getModel: vi.fn().mockReturnValue(mockModel),
    stream: vi.fn().mockImplementation(() =>
      createMockStream([
        { type: "text_delta", delta: "Hello " },
        { type: "text_delta", delta: "from AI!" },
        { type: "done", reason: "stop", message: mockAssistantMessage },
      ]),
    ),
    complete: vi.fn().mockResolvedValue(mockAssistantMessage),
    streamSimple: vi.fn().mockImplementation(() =>
      createMockStream([
        { type: "text_delta", delta: "Hello " },
        { type: "text_delta", delta: "from AI!" },
        { type: "done", reason: "stop", message: mockAssistantMessage },
      ]),
    ),
    completeSimple: vi.fn().mockResolvedValue(mockAssistantMessage),
    validateToolCall: vi.fn(),
    Type: {
      Object: vi.fn().mockReturnValue({ type: "object" }),
      String: vi.fn().mockReturnValue({ type: "string" }),
      Number: vi.fn().mockReturnValue({ type: "number" }),
    },
    // Return tool call message for generateObject tests
    _mockToolCallMessage: mockToolCallMessage,
  };
});

import { AI } from "@/core/ai/ai";
import { getModel, complete, stream, completeSimple, streamSimple } from "@mariozechner/pi-ai";

describe("AI Adapter", () => {
  let ai: AI;

  beforeEach(() => {
    vi.clearAllMocks();
    ai = new AI({ provider: "openai", model: "gpt-4o-mini" });
  });

  describe("constructor", () => {
    it("should create an AI instance and resolve the model", () => {
      expect(getModel).toHaveBeenCalledWith("openai", "gpt-4o-mini");
      expect(ai.model).toBeDefined();
      expect(ai.model.id).toBe("gpt-4o-mini");
    });

    it("should accept an API key in config", () => {
      const aiWithKey = new AI({
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: "sk-test-key",
      });
      expect(aiWithKey.model).toBeDefined();
    });
  });

  describe("complete()", () => {
    it("should return text from a completion", async () => {
      const result = await ai.complete("Hello");
      expect(result).toBe("Hello from AI!");
      expect(complete).toHaveBeenCalledOnce();
    });

    it("should pass system prompt in context", async () => {
      await ai.complete("Hello", { systemPrompt: "Be brief" });
      const callArgs = vi.mocked(complete).mock.calls[0];
      expect(callArgs[1].systemPrompt).toBe("Be brief");
    });

    it("should pass temperature and maxTokens as stream options", async () => {
      await ai.complete("Hello", { temperature: 0.5, maxTokens: 100 });
      const callArgs = vi.mocked(complete).mock.calls[0];
      expect(callArgs[2]).toMatchObject({
        temperature: 0.5,
        maxTokens: 100,
      });
    });

    it("should use completeSimple when reasoning is specified", async () => {
      await ai.complete("Hello", { reasoning: "medium" });
      expect(completeSimple).toHaveBeenCalledOnce();
      expect(complete).not.toHaveBeenCalled();
    });

    it("should pass API key from config to stream options", async () => {
      const aiWithKey = new AI({
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: "sk-test",
      });
      await aiWithKey.complete("Hello");
      const callArgs = vi.mocked(complete).mock.calls[0];
      expect(callArgs[2]).toMatchObject({ apiKey: "sk-test" });
    });
  });

  describe("stream()", () => {
    it("should yield text deltas", async () => {
      const chunks: string[] = [];
      for await (const chunk of ai.stream("Hello")) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual(["Hello ", "from AI!"]);
    });

    it("should use streamSimple when reasoning is specified", async () => {
      const chunks: string[] = [];
      for await (const chunk of ai.stream("Hello", { reasoning: "high" })) {
        chunks.push(chunk);
      }
      expect(streamSimple).toHaveBeenCalledOnce();
      expect(stream).not.toHaveBeenCalled();
    });

    it("should throw on error events", async () => {
      vi.mocked(stream).mockImplementationOnce(() => ({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "error",
            reason: "error",
            error: { errorMessage: "Rate limit exceeded" },
          };
        },
        result: async () => ({}),
      }) as any);

      await expect(async () => {
        for await (const _ of ai.stream("Hello")) {
          // consume
        }
      }).rejects.toThrow("Rate limit exceeded");
    });
  });

  describe("generateObject()", () => {
    it("should return a validated object from tool call", async () => {
      const { z } = await import("zod");
      const schema = z.object({ name: z.string(), age: z.number() });

      // Mock complete to return a tool call
      const piAi = await import("@mariozechner/pi-ai");
      vi.mocked(complete).mockResolvedValueOnce(
        (piAi as any)._mockToolCallMessage,
      );

      const result = await ai.generateObject(
        "Extract: John is 30 years old",
        schema,
      );

      expect(result).toEqual({ name: "John", age: 30 });
    });

    it("should throw when model returns no tool calls", async () => {
      const { z } = await import("zod");
      const schema = z.object({ name: z.string() });

      // Mock complete to return text only (no tool call)
      vi.mocked(complete).mockResolvedValueOnce({
        role: "assistant",
        content: [{ type: "text", text: "I cannot extract that" }],
      } as any);

      await expect(
        ai.generateObject("Extract something", schema),
      ).rejects.toThrow("AI did not return a tool call");
    });

    it("should throw when output fails Zod validation", async () => {
      const { z } = await import("zod");
      const schema = z.object({ name: z.string(), age: z.number() });

      // Mock complete to return mismatched data
      vi.mocked(complete).mockResolvedValueOnce({
        role: "assistant",
        content: [
          {
            type: "toolCall",
            id: "call_456",
            name: "extract_data",
            arguments: { name: 123, age: "not-a-number" }, // wrong types
          },
        ],
      } as any);

      await expect(
        ai.generateObject("Extract something", schema),
      ).rejects.toThrow("schema validation");
    });
  });

  describe("raw()", () => {
    it("should return pi-ai primitives", () => {
      const raw = ai.raw();
      expect(raw.model).toBeDefined();
      expect(raw.stream).toBeDefined();
      expect(raw.complete).toBeDefined();
      expect(raw.streamSimple).toBeDefined();
      expect(raw.completeSimple).toBeDefined();
      expect(raw.getModel).toBeDefined();
      expect(raw.validateToolCall).toBeDefined();
    });
  });
});
