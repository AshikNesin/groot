import { resolve } from "node:path";
import { isAbsolute } from "node:path";
import Keyv from "keyv";
import KeyvSqlite from "@keyv/sqlite";
import { logger } from "@groot/core/logger";
import { env } from "@groot/core/env";

// KeyvSqlite manages its own sqlite3 connection (async, via the `sqlite3`
// native driver — distinct from Prisma's better-sqlite3 handle). It cannot
// share Prisma's DB handle, but KV access is infrequent and short-lived so a
// second connection is negligible. `uri` accepts a `sqlite://path` URL; we
// normalise DATABASE_URL (a bare path or `:memory:`) into that form.
function toKeyvUri(url: string): string {
  if (url === ":memory:") return "sqlite://:memory:";
  const stripped = url.replace(/^file:/, "");
  const abs = isAbsolute(stripped) ? stripped : resolve(process.cwd(), stripped);
  return `sqlite://${abs}`;
}

export const store = new KeyvSqlite({
  uri: toKeyvUri(env.DATABASE_URL ?? ":memory:"),
  table: "keyv",
  busyTimeout: 5_000,
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
