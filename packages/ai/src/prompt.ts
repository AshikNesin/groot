import type { z } from "zod";
import type { PromptMessage } from "./messages";
import type { ThinkingLevel } from "./types";

/**
 * A reusable AI task: typed input → messages → typed structured output.
 * Execute with `ai.execute(prompt, input)`.
 */
export interface PromptDefinition<Input, Output> {
  name: string;
  description?: string;
  /** Validates the caller's input before messages are built. */
  inputSchema: z.ZodType<Input>;
  /** Structured output schema — must be a ZodObject (returned via tool calling). */
  outputSchema: z.ZodType<Output>;
  /** Informational default model id — callers may override per execution. */
  defaultModel?: string;
  /** Reasoning effort for thinking models. */
  reasoning?: ThinkingLevel;
  maxTokens?: number;
  temperature?: number;
  /** Build the messages sent to the model from validated input. */
  getMessages(input: Input): PromptMessage[];
}

export function definePrompt<Input, Output>(
  definition: PromptDefinition<Input, Output>,
): PromptDefinition<Input, Output> {
  return definition;
}
