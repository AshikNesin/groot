import Keyv from "keyv";
import KeyvPostgres from "@keyv/postgres";
import { logger } from "@/core/logger";
import { env } from "@/core/env";

// PostgreSQL store using @keyv/postgres
export const store = new KeyvPostgres(env.DATABASE_URL, {
  table: "keyv", // Use the Keyv table from Prisma schema
});

// Default KV instance
export const kv = new Keyv({
  store,
});

// Log errors from the KV store
kv.on("error", (error) => {
  logger.error({ error }, "KV store error");
});

/**
 * Creates a namespaced KV instance
 * Useful for separating different types of data (e.g., sessions, cache, etc.)
 */
export const createNamespaceKv = (namespace: string) =>
  new Keyv({
    store,
    namespace,
  });
