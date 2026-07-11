import * as client from "./client";
import * as queue from "./queue";
import * as queries from "./queries";
import * as worker from "./worker";
import * as constants from "./constants";
import * as config from "./config";
import * as logger from "./logger";
import * as errorHandler from "./error-handler";

/**
 * Namespace export for clean discovery (e.g. JobSystem.queue.addJob).
 */
export const JobSystem = {
  ...client,
  queue,
  queries,
  worker,
  constants,
  config,
  logger,
  errorHandler,
} as const;

// Public API
export * from "./client";
export * from "./queue";
export * from "./queries";
export * from "./worker";
export * from "./constants";
export * from "./config";
export * from "./types";
export * from "./logger";
export * from "./error-handler";
export { jobRoutes } from "./routes";
