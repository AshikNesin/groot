import { PgBoss } from "pg-boss";
import { logger } from "@groot/logger";
import { jobConfig } from "./config";

let bossInstance: PgBoss | null = null;

export const getBoss = (): PgBoss => {
  if (!bossInstance) {
    throw new Error("Job queue not initialized. Call initJobQueue() first.");
  }
  return bossInstance;
};

export const initJobQueue = async (): Promise<void> => {
  if (bossInstance) {
    logger.warn("Job queue already initialized");
    return;
  }

  bossInstance = new PgBoss({
    connectionString: jobConfig.connectionString,
    archiveCompletedAfterSeconds: jobConfig.archiveCompletedAfterSeconds,
    deleteArchivedAfterSeconds: jobConfig.deleteArchivedAfterSeconds,
    monitorStateIntervalSeconds: jobConfig.monitorStateIntervalSeconds,
  });

  bossInstance.on("error", (error) => {
    logger.error({ error }, "PgBoss error");
  });

  bossInstance.on("monitor-states", (states) => {
    logger.debug({ states }, "PgBoss state monitor");
  });

  await bossInstance.start();
  logger.info("Job queue initialized");
};

export const stopJobQueue = async (): Promise<void> => {
  if (!bossInstance) {
    return;
  }

  try {
    const { stopWorkers } = await import("./worker");
    await stopWorkers();
  } finally {
    try {
      await bossInstance.stop();
      logger.info("Job queue stopped");
    } finally {
      bossInstance = null;
    }
  }
};
