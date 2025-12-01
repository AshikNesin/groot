import { randomUUID } from "node:crypto";

/**
 * Trace context for request correlation
 * Helps track requests across services and async operations
 */

export interface TraceContext {
  traceId: string;
  parentTraceId?: string;
  startTime: number;
}

// Simple in-memory storage (in production, use AsyncLocalStorage)
let currentTraceContext: TraceContext | null = null;

/**
 * Create a new trace context
 */
export function createTraceContext(parentTraceId?: string): TraceContext {
  const context: TraceContext = {
    traceId: randomUUID(),
    parentTraceId,
    startTime: Date.now(),
  };

  currentTraceContext = context;
  return context;
}

/**
 * Get the current trace context
 */
export function getCurrentTraceContext(): TraceContext | null {
  return currentTraceContext;
}

/**
 * Clear the current trace context
 */
export function clearTraceContext(): void {
  currentTraceContext = null;
}
