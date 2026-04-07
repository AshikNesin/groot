import { AIClient } from "@/core/ai/client";
import * as schema from "@/core/ai/schema";

/**
 * Unified AI System namespace
 */
export const AISystem = {
  Client: AIClient,
  schema,
} as const;

// Backwards-compatible exports
export { AIClient as AI } from "@/core/ai/client";

// Flat exports
export * from "@/core/ai/client";
export * from "@/core/ai/schema";
export * from "@/core/ai/types";
