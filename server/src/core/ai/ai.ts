import {
  getModel,
  stream as piStream,
  complete as piComplete,
  streamSimple as piStreamSimple,
  completeSimple as piCompleteSimple,
  validateToolCall,
} from "@mariozechner/pi-ai";
import { Type } from "@mariozechner/pi-ai";
import type { TSchema } from "@mariozechner/pi-ai";
import type { z } from "zod";
import type {
  AIConfig,
  CompletionOptions,
  GenerateObjectOptions,
  Context,
  AssistantMessage,
  PiAITool,
  TextContent,
  ImageContent,
} from "./types";

/**
 * Convert a Zod schema to a TypeBox schema for pi-ai tool definitions.
 * Supports common types: string, number, boolean, object, array, optional, enum, nullable.
 */
function zodToTypeBox(schema: z.ZodTypeAny): TSchema {
  const def = (schema as any)._def;
  if (!def) {
    return Type.Any();
  }

  const typeName = def.typeName;

  switch (typeName) {
    case "ZodString":
      return Type.String(
        def.description ? { description: def.description } : undefined,
      );

    case "ZodNumber":
      return Type.Number(
        def.description ? { description: def.description } : undefined,
      );

    case "ZodBoolean":
      return Type.Boolean(
        def.description ? { description: def.description } : undefined,
      );

    case "ZodObject": {
      const shape = def.shape?.();
      if (!shape) return Type.Object({});
      const properties: Record<string, TSchema> = {};
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToTypeBox(value as z.ZodTypeAny);
      }
      return Type.Object(properties);
    }

    case "ZodArray":
      return Type.Array(zodToTypeBox(def.type));

    case "ZodOptional":
      return Type.Optional(zodToTypeBox(def.innerType));

    case "ZodNullable":
      return Type.Union([zodToTypeBox(def.innerType), Type.Null()]);

    case "ZodEnum":
      return Type.Union(
        (def.values as string[]).map((v: string) => Type.Literal(v)),
      );

    case "ZodLiteral":
      return Type.Literal(def.value);

    case "ZodDefault":
      return zodToTypeBox(def.innerType);

    case "ZodEffects":
      return zodToTypeBox(def.schema);

    default:
      return Type.Any();
  }
}

/**
 * AI adapter wrapping @mariozechner/pi-ai with a simplified developer experience.
 *
 * @example
 * ```ts
 * const ai = new AI({ provider: "anthropic", model: "claude-sonnet-4-6" });
 *
 * // Simple completion
 * const text = await ai.complete("Summarize this article: ...");
 *
 * // Streaming
 * for await (const chunk of ai.stream("Write a poem")) {
 *   process.stdout.write(chunk);
 * }
 *
 * // Structured output with Zod
 * const result = await ai.generateObject(
 *   "Extract info: John is 30",
 *   z.object({ name: z.string(), age: z.number() })
 * );
 * ```
 */
export class AI {
  private config: AIConfig;
  private _model: ReturnType<typeof getModel>;

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
  async complete(
    prompt: string | (TextContent | ImageContent)[],
    options: CompletionOptions = {},
  ): Promise<string> {
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
  async *stream(
    prompt: string | (TextContent | ImageContent)[],
    options: CompletionOptions = {},
  ): AsyncGenerator<string, void, undefined> {
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
        throw new Error(
          event.error.errorMessage || "AI streaming error",
        );
      }
    }
  }

  /**
   * Generate a structured object from a Zod schema.
   *
   * Uses a tool-calling approach: the schema is converted to a TypeBox
   * tool definition, the model is forced to call it, and the result is
   * validated against the Zod schema.
   *
   * @throws Error if schema is not a ZodObject (tool parameters must be objects)
   */
  async generateObject<T>(
    prompt: string | (TextContent | ImageContent)[],
    schema: z.ZodType<T>,
    options: GenerateObjectOptions = {},
  ): Promise<T> {
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
      description:
        options.schemaDescription ||
        "Extract structured data from the provided text",
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

    // Support reasoning option - use simple variants when reasoning is specified
    const response = options.reasoning
      ? await piCompleteSimple(this._model, context, {
          ...streamOptions,
          reasoning: options.reasoning,
        })
      : await piComplete(this._model, context, streamOptions);

    const toolCalls = response.content.filter(
      (block) => block.type === "toolCall",
    );

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
      throw new Error(
        `AI output failed schema validation: ${parsed.error.message}`,
      );
    }

    return parsed.data;
  }

  /**
   * Escape hatch — get the raw pi-ai primitives for full control.
   *
   * @example
   * ```ts
   * const { model, stream, complete } = ai.raw();
   * const response = await complete(model, myCustomContext, myOptions);
   * ```
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

  private buildContext(prompt: string | (TextContent | ImageContent)[], options: CompletionOptions): Context {
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
    const textBlocks = response.content.filter(
      (block) => block.type === "text",
    );
    return textBlocks.map((block) => (block as any).text).join("");
  }
}
