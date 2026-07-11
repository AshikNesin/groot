import { randomUUID } from "node:crypto";
import { getLoggerContext } from "./context";

/**
 * Trace context for request correlation
 * Helps track requests across services and async operations
 */

export interface TraceContext {
  traceId: string;
  parentTraceId?: string;
  startTime: number;
}

/**
 * Create a new trace context
 * Note: must be called inside a runWithLoggerContext block!
 */
export function createTraceContext(parentTraceId?: string): TraceContext {
  const traceContext: TraceContext = {
    traceId: randomUUID(),
    parentTraceId,
    startTime: Date.now(),
  };

  const context = getLoggerContext();
  if (context) {
    context.trace = traceContext;
  }

  return traceContext;
}

/**
 * Get the current trace context
 */
export function getCurrentTraceContext(): TraceContext | null {
  return getLoggerContext()?.trace ?? null;
}

/**
 * Clear the current trace context
 */
export function clearTraceContext(): void {
  const context = getLoggerContext();
  if (context) {
    context.trace = null;
  }
}
