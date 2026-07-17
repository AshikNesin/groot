import { resolve, isAbsolute } from "node:path";
import Keyv from "keyv";
import KeyvPostgres from "@keyv/postgres";
import KeyvSqlite from "@keyv/sqlite";
import { logger } from "@groot/core/logger";
import { env } from "@groot/core/env";
import { isPostgres } from "@groot/core/database/engine";

// The KV store backend is selected by DATABASE_ENGINE to match the Prisma
// adapter. Both @keyv/postgres and @keyv/sqlite implement the same Keyv
// adapter interface, so the rest of the code is engine-agnostic.
//
// Neither adapter can share Prisma's DB handle (@keyv/postgres manages its own
// pg.Pool; @keyv/sqlite uses the async `sqlite3` driver, distinct from
// better-sqlite3), but KV access is infrequent so a second connection is
// negligible on either engine. Both packages are always installed (dual-engine
// support), so we import them statically.

/** Normalise a SQLite DATABASE_URL into the `sqlite://<path>` URI @keyv/sqlite wants. */
function toKeyvSqliteUri(url: string): string {
  if (url === ":memory:") return "sqlite://:memory:";
  const stripped = url.replace(/^file:/, "");
  const abs = isAbsolute(stripped) ? stripped : resolve(process.cwd(), stripped);
  return `sqlite://${abs}`;
}

const store = isPostgres
  ? new KeyvPostgres({
      uri: env.DATABASE_URL!,
      table: "keyv",
      max: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  : new KeyvSqlite({
      uri: toKeyvSqliteUri(env.DATABASE_URL ?? ":memory:"),
      table: "keyv",
      busyTimeout: 5_000,
    });

export { store };

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
