// Re-export key types from @earendil-works/pi-ai for convenience
import type { ThinkingLevel } from "@earendil-works/pi-ai/compat";

export type {
  Api,
  AssistantMessage,
  AssistantMessageEvent,
  AssistantMessageEventStream,
  Context,
  ImageContent,
  KnownProvider,
  Message,
  Model,
  Provider,
  SimpleStreamOptions,
  StopReason,
  StreamOptions as PiAIStreamOptions,
  TextContent,
  ThinkingContent,
  Tool as PiAITool,
  ToolCall,
  ToolResultMessage,
  Usage,
  UserMessage,
} from "@earendil-works/pi-ai/compat";

// ThinkingLevel is a type union, re-export separately for use in interfaces
export type { ThinkingLevel };

// Re-export TypeBox helpers (used for pi-ai tool definitions)
export { Type } from "@earendil-works/pi-ai/compat";
export type { Static, TSchema } from "@earendil-works/pi-ai/compat";

/**
 * Configuration for creating an AI instance
 */
export interface AIConfig {
  /** Provider name (e.g., 'openai') */
  provider: string;
  /** Model ID (e.g., 'gpt-4o-mini', 'claude-sonnet-4-20250514') */
  model: string;
  /** Optional API key (overrides environment variable) */
  apiKey?: string;
}

/**
 * Options for `ai.complete()` and `ai.stream()`
 */
export interface CompletionOptions {
  /** System prompt */
  systemPrompt?: string;
  /** Temperature (0-2, lower = more deterministic) */
  temperature?: number;
  /** Max tokens in response */
  maxTokens?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Reasoning level for thinking models */
  reasoning?: ThinkingLevel;
}

/**
 * Options for `ai.generateObject()`
 */
export interface GenerateObjectOptions extends CompletionOptions {
  /** How "hard" to instruct the model to comply with the schema */
  schemaName?: string;
  /** Description for the schema shown to the LLM */
  schemaDescription?: string;
}
