import * as core from "./core";
import * as factories from "./factories";
import * as context from "./context";
import * as traceContext from "./trace-context";
import * as breadcrumbs from "./breadcrumbs";
import * as jobStream from "./job-stream";

/**
 * Unified Logger System namespace
 */
export const LoggerSystem = {
  core: core.logger,
  ...factories,
  context,
  traceContext,
  breadcrumbs,
  jobStream,
} as const;

// Backwards compatibility core logger export
export const logger = core.logger;
export default logger;

// Flat exports
export * from "./core";
export * from "./factories";
export * from "./context";
export * from "./trace-context";
export * from "./breadcrumbs";
export * from "./job-stream";
