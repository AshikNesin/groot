// Re-export key types from @mariozechner/pi-ai for convenience
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
} from "@mariozechner/pi-ai";

// ThinkingLevel is a type union, re-export separately for use in interfaces
export type { ThinkingLevel } from "@mariozechner/pi-ai";

// Re-export TypeBox helpers (used for pi-ai tool definitions)
export { Type } from "@mariozechner/pi-ai";
export type { Static, TSchema } from "@mariozechner/pi-ai";

/**
 * Configuration for creating an AI instance
 */
export interface AIConfig {
  /** Provider name (e.g., 'openai', 'anthropic', 'google') */
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
