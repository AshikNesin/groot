import { AIClient } from "./client";
import * as schema from "./schema";

/**
 * Unified AI System namespace
 */
export const AISystem = {
  Client: AIClient,
  schema,
} as const;

// Backwards-compatible exports
export { AIClient as AI } from "./client";

// Flat exports
export * from "./client";
export * from "./schema";
export * from "./types";
