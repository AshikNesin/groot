import Keyv from "keyv";
import KeyvPostgres from "@keyv/postgres";
import { logger } from "@/core/logger";

// Get database URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

// PostgreSQL store using @keyv/postgres
const store = new KeyvPostgres(DATABASE_URL, {
  table: "keyv", // Use the Keyv table from Prisma schema
});

// Default KV instance
const kv = new Keyv({
  store,
});

// Log errors from the KV store
kv.on("error", (error) => {
  logger.error({ error }, "KV store error");
});

/**
 * Creates a namespaced KV instance
 * Useful for separating different types of data (e.g., sessions, cache, etc.)
 *
 * @param namespace - The namespace for the KV instance
 * @returns A new Keyv instance with the specified namespace
 */
export const createNamespaceKv = (namespace: string) =>
  new Keyv({
    store,
    namespace,
  });

export default kv;
