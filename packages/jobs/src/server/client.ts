import { PgBoss } from "pg-boss";
import { logger } from "@groot/core/logger";
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
    // Explicitly cap the pg-boss connection pool. The default is pg's max=10
    // which is too generous for a background-job pool sharing the DB with
    // Prisma and the KV store. 3 connections handle all pg-boss internal
    // queries (polling, lock, maintenance) without starving Prisma.
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  bossInstance.on("error", (error) => {
    logger.error({ error }, "PgBoss error");
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
