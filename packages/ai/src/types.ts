// Re-export key types from @earendil-works/pi-ai for convenience
import type { Model as PiAIModel, ThinkingLevel } from "@earendil-works/pi-ai/compat";

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
 * A pi-ai model of any API flavor — resolved from the built-in catalog or
 * constructed for a custom endpoint. (`Model<TApi>` is invariant in its
 * `compat` field, hence the `any`.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyModel = PiAIModel<any>;

/**
 * Configuration for creating an AI instance
 */
export interface AIConfig {
  /**
   * Provider name. For catalog models this is a pi-ai provider id
   * (e.g. "openai", "anthropic"); for custom endpoints it's just a label.
   */
  provider: string;
  /** Model ID (e.g. "gpt-4o-mini", "claude-sonnet-4-6", or a gateway id like "google/gemini-3-flash-preview") */
  model: string;
  /** Optional API key (overrides the provider's environment variable) */
  apiKey?: string;
  /**
   * Custom OpenAI-compatible endpoint (e.g. Cloudflare AI Gateway).
   * When set, requests go straight to this URL and the built-in model
   * catalog is bypassed.
   */
  baseUrl?: string;
  /** Extra HTTP headers for custom endpoints (e.g. { "cf-aig-authorization": "Bearer …" }) */
  headers?: Record<string, string>;
  /** Custom endpoints only: set true if the model supports reasoning/thinking. Default false. */
  reasoning?: boolean;
  /** Custom endpoints only: accepted input modalities. Default ["text", "image"]. */
  input?: ("text" | "image")[];
  /** Model used by embed(). Defaults to "text-embedding-3-small". */
  embeddingModel?: string;
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
  /** Name of the tool the model is forced to call (defaults to "extract_data") */
  schemaName?: string;
  /** Description for the schema shown to the LLM */
  schemaDescription?: string;
}
