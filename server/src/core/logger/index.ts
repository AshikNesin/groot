import * as core from "@/core/logger/core";
import * as factories from "@/core/logger/factories";
import * as context from "@/core/logger/context";
import * as traceContext from "@/core/logger/trace-context";
import * as breadcrumbs from "@/core/logger/breadcrumbs";
import * as jobStream from "@/core/logger/job-stream";

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
export * from "@/core/logger/core";
export * from "@/core/logger/factories";
export * from "@/core/logger/context";
export * from "@/core/logger/trace-context";
export * from "@/core/logger/breadcrumbs";
export * from "@/core/logger/job-stream";
