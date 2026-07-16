import Keyv from "keyv";
import KeyvPostgres from "@keyv/postgres";
import { logger } from "@groot/core/logger";
import { env } from "@groot/core/env";

// KeyvPostgres manages its own internal pg.Pool singleton keyed by URI —
// it does not accept an external pool instance. We cap `max` and
// `idleTimeoutMillis` so its pool stays small: KV queries are infrequent
// and short-lived, so 2 connections are more than sufficient.
export const store = new KeyvPostgres({
  uri: env.DATABASE_URL,
  table: "keyv",
  // Pool size opts are forwarded to pg.Pool by @keyv/postgres
  max: 2,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
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
