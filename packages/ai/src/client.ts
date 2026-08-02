import {
  getModel,
  stream as piStream,
  complete as piComplete,
  streamSimple as piStreamSimple,
  completeSimple as piCompleteSimple,
  validateToolCall,
} from "@earendil-works/pi-ai/compat";
import OpenAI from "openai";
import type { z } from "zod";
import { toPiContext, type PromptMessage } from "./messages";
import { resolveModel } from "./model";
import type { PromptDefinition } from "./prompt";
import { zodToTypeBox } from "./schema";
import type {
  AIConfig,
  AnyModel,
  AssistantMessage,
  CompletionOptions,
  Context,
  GenerateObjectOptions,
  ImageContent,
  PiAITool,
  TextContent,
} from "./types";

export type CompleteParams = CompletionOptions & {
  prompt: string | (TextContent | ImageContent)[];
};

export type StreamParams = CompleteParams;

export type GenerateObjectParams<T> = GenerateObjectOptions & {
  schema: z.ZodType<T>;
} & (
    | { prompt: string | (TextContent | ImageContent)[]; messages?: never }
    | { messages: PromptMessage[]; prompt?: never }
  );

/**
 * AI adapter wrapping @earendil-works/pi-ai/compat with a simplified developer experience.
 */
export class AIClient {
  private config: AIConfig;
  private _model: AnyModel;
  private _openaiClient: OpenAI | null = null;

  constructor(config: AIConfig) {
    this.config = config;
    this._model = resolveModel(config);
  }

  /**
   * Get the underlying pi-ai model instance.
   */
  get model() {
    return this._model;
  }

  /**
   * A new client with the same provider/endpoint but a different model id.
   * Cheap — model resolution is a catalog lookup or plain object construction.
   */
  withModel(modelId: string): AIClient {
    return new AIClient({ ...this.config, model: modelId });
  }

  /**
   * Simple text completion — send a prompt, get a string back.
   */
  async complete(params: string | CompleteParams): Promise<string> {
    const { prompt, ...options } = typeof params === "string" ? { prompt: params } : params;
    const context = toPiContext([{ role: "user", content: prompt }], options.systemPrompt);
    const response = await this.runComplete(context, options);
    return this.extractText(response);
  }

  /**
   * Stream text completion — returns an async generator yielding text deltas.
   */
  async *stream(params: string | StreamParams): AsyncGenerator<string, void, undefined> {
    const { prompt, ...options } = typeof params === "string" ? { prompt: params } : params;
    const context = toPiContext([{ role: "user", content: prompt }], options.systemPrompt);
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
   * Generate a structured object from a Zod schema (via tool calling).
   */
  async generateObject<T>(params: GenerateObjectParams<T>): Promise<T> {
    const { prompt, messages, schema, ...options } = params;

    // Tool parameters must be objects — reject anything else up front.
    // Zod 3 uses `_def.typeName` ("ZodObject"); Zod 4 uses `_def.type` ("object").
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def = (schema as any)._def;
    const typeName: string | undefined = def?.type ?? def?.typeName;
    if (typeName !== "ZodObject" && typeName !== "object") {
      throw new Error(
        "generateObject requires a ZodObject schema. Tool parameters must be objects, " +
          `received: ${typeName || "unknown"}`,
      );
    }

    const toolName = options.schemaName || "extract_data";
    const tool: PiAITool = {
      name: toolName,
      description: options.schemaDescription || "Extract structured data from the provided input",
      parameters: zodToTypeBox(schema),
    };

    const systemPrompt =
      options.systemPrompt ??
      `You are a data extraction assistant. Always use the "${toolName}" tool to return your response. Never respond with plain text.`;

    let context: Context;
    if (messages !== undefined) {
      context = toPiContext(messages, systemPrompt);
    } else if (prompt !== undefined) {
      context = toPiContext([{ role: "user", content: prompt }], systemPrompt);
    } else {
      throw new Error("generateObject requires either `prompt` or `messages`.");
    }
    context.tools = [tool];

    const response = await this.runComplete(context, options);
    this.assertOk(response);

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
   * Execute a prompt definition: validates input, builds messages, returns
   * Zod-validated structured output. Pass `options.model` to run the same
   * prompt against a different model on the same provider/endpoint.
   */
  async execute<Input, Output>(
    prompt: PromptDefinition<Input, Output>,
    input: Input,
    options?: { model?: string; signal?: AbortSignal },
  ): Promise<Output> {
    const parsed = prompt.inputSchema.parse(input);
    const client = options?.model ? this.withModel(options.model) : this;
    return client.generateObject<Output>({
      messages: prompt.getMessages(parsed),
      schema: prompt.outputSchema,
      schemaName: prompt.name,
      schemaDescription: prompt.description,
      reasoning: prompt.reasoning,
      maxTokens: prompt.maxTokens,
      temperature: prompt.temperature,
      signal: options?.signal,
    });
  }

  /**
   * Generate embeddings for the given text(s) using OpenAI.
   */
  async embed(texts: string | string[]): Promise<number[][]> {
    const input = Array.isArray(texts) ? texts : [texts];
    if (!this._openaiClient) {
      // Without an explicit key the SDK falls back to OPENAI_API_KEY.
      this._openaiClient = new OpenAI(this.config.apiKey ? { apiKey: this.config.apiKey } : {});
    }
    const response = await this._openaiClient.embeddings.create({
      model: this.config.embeddingModel ?? "text-embedding-3-small",
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

  private runComplete(context: Context, options: CompletionOptions): Promise<AssistantMessage> {
    const streamOptions = this.buildStreamOptions(options);
    return options.reasoning
      ? piCompleteSimple(this._model, context, {
          ...streamOptions,
          reasoning: options.reasoning,
        })
      : piComplete(this._model, context, streamOptions);
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

  private assertOk(response: AssistantMessage): void {
    if (response.stopReason === "error" || response.stopReason === "aborted") {
      throw new Error(response.errorMessage || `AI request ${response.stopReason}`);
    }
  }

  private extractText(response: AssistantMessage): string {
    this.assertOk(response);
    const textBlocks = response.content.filter((block) => block.type === "text");
    return textBlocks.map((block) => (block as TextContent).text).join("");
  }
}
