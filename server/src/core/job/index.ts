import * as client from "./client";
import * as queue from "./queue";
import * as queries from "./queries";
import * as worker from "./worker";
import * as constants from "./constants";

/**
 * Namespace export for clean discovery (e.g. JobSystem.queue.addJob).
 */
export const JobSystem = {
  ...client,
  queue,
  queries,
  worker,
  constants,
} as const;

// Top-level exports for backwards compatibility across existing controllers
export * from "./client";
export * from "./queue";
export * from "./queries";
export * from "./worker";
export * from "./constants";
export * from "./types";
