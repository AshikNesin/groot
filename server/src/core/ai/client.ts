import {
  getModel,
  stream as piStream,
  complete as piComplete,
  streamSimple as piStreamSimple,
  completeSimple as piCompleteSimple,
  validateToolCall,
} from "@mariozechner/pi-ai";
import type { z } from "zod";
import OpenAI from "openai";
import type {
  AIConfig,
  CompletionOptions,
  GenerateObjectOptions,
  Context,
  AssistantMessage,
  PiAITool,
  TextContent,
  ImageContent,
} from "@/core/ai/types";
import { zodToTypeBox } from "@/core/ai/schema";
import { env } from "@/core/env";

export type CompleteParams = CompletionOptions & {
  prompt: string | (TextContent | ImageContent)[];
};

export type GenerateObjectParams<T> = GenerateObjectOptions & {
  prompt: string | (TextContent | ImageContent)[];
  schema: z.ZodType<T>;
};

export type StreamParams = CompletionOptions & {
  prompt: string | (TextContent | ImageContent)[];
};

/**
 * AI adapter wrapping @mariozechner/pi-ai with a simplified developer experience.
 */
export class AIClient {
  private config: AIConfig;
  private _model: ReturnType<typeof getModel>;
  private _openaiClient: OpenAI | null = null;

  constructor(config: AIConfig) {
    this.config = config;
    this._model = getModel(config.provider as any, config.model);
  }

  /**
   * Get the underlying pi-ai model instance.
   */
  get model() {
    return this._model;
  }

  /**
   * Simple text completion — send a prompt, get a string back.
   */
  async complete(params: CompleteParams): Promise<string> {
    const { prompt, ...options } = params;
    const context = this.buildContext(prompt, options);
    const streamOptions = this.buildStreamOptions(options);

    const response = options.reasoning
      ? await piCompleteSimple(this._model, context, {
          ...streamOptions,
          reasoning: options.reasoning,
        })
      : await piComplete(this._model, context, streamOptions);

    return this.extractText(response);
  }

  /**
   * Stream text completion — returns an async generator yielding text deltas.
   */
  async *stream(params: StreamParams): AsyncGenerator<string, void, undefined> {
    const { prompt, ...options } = params;
    const context = this.buildContext(prompt, options);
    const streamOptions = this.buildStreamOptions(options);

    const s = options.reasoning
      ? piStreamSimple(this._model, context, {
          ...streamOptions,
          reasoning: options.reasoning,
        })
      : piStream(this._model, context, streamOptions);

    for await (const event of s) {
      if (event.type === "text_delta") {
        yield event.delta;
      } else if (event.type === "error") {
        throw new Error(event.error.errorMessage || "AI streaming error");
      }
    }
  }

  /**
   * Generate a structured object from a Zod schema.
   */
  async generateObject<T>(params: GenerateObjectParams<T>): Promise<T> {
    const { prompt, schema, ...options } = params;

    // Validate that the schema is an object type - tool parameters must be objects
    const def = (schema as any)._def;
    const typeName = def?.typeName;
    if (typeName !== "ZodObject") {
      throw new Error(
        "generateObject requires a ZodObject schema. Tool parameters must be objects, " +
          `received: ${typeName || "unknown"}`,
      );
    }

    const typeboxSchema = zodToTypeBox(schema);

    const toolName = options.schemaName || "extract_data";
    const tool: PiAITool = {
      name: toolName,
      description: options.schemaDescription || "Extract structured data from the provided text",
      parameters: typeboxSchema,
    };

    const context: Context = {
      systemPrompt:
        options.systemPrompt ||
        `You are a data extraction assistant. Always use the "${toolName}" tool to return your response. Never respond with plain text.`,
      messages: [{ role: "user", content: prompt, timestamp: Date.now() }],
      tools: [tool],
    };

    const streamOptions = this.buildStreamOptions(options);

    const response = options.reasoning
      ? await piCompleteSimple(this._model, context, {
          ...streamOptions,
          reasoning: options.reasoning,
        })
      : await piComplete(this._model, context, streamOptions);

    const errorBlocks = response.content.filter((block) => block.type === "error");
    if (errorBlocks.length > 0) {
      const errorBlock = errorBlocks[0] as any;
      throw new Error(
        errorBlock.error?.errorMessage || "AI completion error during object generation",
      );
    }

    const toolCalls = response.content.filter((block) => block.type === "toolCall");

    if (toolCalls.length === 0) {
      throw new Error(
        "AI did not return a tool call. The model may not support tool calling, " +
          "or the prompt did not trigger structured output.",
      );
    }

    const toolCall = toolCalls[0];
    if (toolCall.type !== "toolCall") {
      throw new Error("Unexpected content block type");
    }

    // Validate with Zod
    const parsed = schema.safeParse(toolCall.arguments);
    if (!parsed.success) {
      throw new Error(`AI output failed schema validation: ${parsed.error.message}`);
    }

    return parsed.data;
  }

  /**
   * Generate embeddings for the given text(s) using OpenAI.
   */
  async embed(texts: string | string[]): Promise<number[][]> {
    const input = Array.isArray(texts) ? texts : [texts];
    if (!this._openaiClient) {
      this._openaiClient = new OpenAI({
        apiKey: this.config.apiKey || env.OPENAI_API_KEY,
      });
    }
    const response = await this._openaiClient.embeddings.create({
      model: this.config.model || "text-embedding-3-small",
      input,
    });
    return response.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }

  /**
   * Escape hatch — get the raw pi-ai primitives for full control.
   */
  raw() {
    return {
      model: this._model,
      stream: piStream,
      complete: piComplete,
      streamSimple: piStreamSimple,
      completeSimple: piCompleteSimple,
      getModel,
      validateToolCall,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private buildContext(
    prompt: string | (TextContent | ImageContent)[],
    options: CompletionOptions,
  ): Context {
    return {
      systemPrompt: options.systemPrompt,
      messages: [{ role: "user", content: prompt, timestamp: Date.now() }],
    };
  }

  private buildStreamOptions(options: CompletionOptions) {
    return {
      ...(this.config.apiKey && { apiKey: this.config.apiKey }),
      ...(options.temperature !== undefined && {
        temperature: options.temperature,
      }),
      ...(options.maxTokens !== undefined && { maxTokens: options.maxTokens }),
      ...(options.signal && { signal: options.signal }),
    };
  }

  private extractText(response: AssistantMessage): string {
    const errorBlocks = response.content.filter((block) => block.type === "error");
    if (errorBlocks.length > 0) {
      const errorBlock = errorBlocks[0] as any;
      throw new Error(errorBlock.error?.errorMessage || "AI completion error");
    }

    const textBlocks = response.content.filter((block) => block.type === "text");
    return textBlocks.map((block) => (block as any).text).join("");
  }
}
