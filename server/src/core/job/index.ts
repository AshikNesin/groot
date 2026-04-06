import * as client from "@/core/job/client";
import * as queue from "@/core/job/queue";
import * as queries from "@/core/job/queries";
import * as worker from "@/core/job/worker";
import * as constants from "@/core/job/constants";

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
export * from "@/core/job/client";
export * from "@/core/job/queue";
export * from "@/core/job/queries";
export * from "@/core/job/worker";
export * from "@/core/job/constants";
export * from "@/core/job/types";
