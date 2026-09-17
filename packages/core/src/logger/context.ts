import { AsyncLocalStorage } from "node:async_hooks";
import type { TraceContext } from "./trace-context";

export interface LoggerContextData {
  trace: TraceContext | null;
}

const loggerContextStore = new AsyncLocalStorage<LoggerContextData>();

/**
 * Run a function with a newly isolated logger context.
 */
export function runWithLoggerContext<T>(callback: () => T): T {
  return loggerContextStore.run({ trace: null }, callback);
}

/**
 * Access the active logger context
 */
export function getLoggerContext(): LoggerContextData | undefined {
  return loggerContextStore.getStore();
}
