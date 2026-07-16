import { logger } from "@groot/core/logger";
import { isPostgres } from "@groot/core/database/engine";
import { jobConfig } from "./config";
import type { JobQueueAdapter } from "./adapter";
import { PgBossAdapter } from "./pgboss-adapter";
import { HonkerAdapter } from "./honker-adapter";

let adapter: JobQueueAdapter | null = null;

export const getJobQueue = (): JobQueueAdapter => {
  if (!adapter) {
    throw new Error("Job queue not initialized. Call initJobQueue() first.");
  }
  return adapter;
};

export const initJobQueue = async (): Promise<void> => {
  if (adapter) {
    logger.warn("Job queue already initialized");
    return;
  }
  adapter = isPostgres ? new PgBossAdapter() : new HonkerAdapter();
  await adapter.start();
  logger.info({ engine: isPostgres ? "postgres" : "sqlite" }, "Job queue initialized");
};

export const stopJobQueue = async (): Promise<void> => {
  if (!adapter) {
    return;
  }
  try {
    const { stopWorkers } = await import("./worker");
    await stopWorkers();
  } finally {
    try {
      await adapter.stop();
      logger.info("Job queue stopped");
    } finally {
      adapter = null;
    }
  }
};

// jobConfig is re-exported for callers that used to import it from here.
export { jobConfig };
