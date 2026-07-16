import "varlock/auto-load";
import { ENV } from "varlock/env";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { dbEngine, isPostgres } from "./engine";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const isDev = ENV.NODE_ENV === "development";

/**
 * Resolve the SQLite database file path from a `file:` URL or bare path.
 *
 * Accepts `:memory:`, an optional `file:` prefix, a relative path (resolved
 * against `process.cwd()`), or an absolute path. The parent directory is
 * created on demand so a fresh checkout just works. Only used when
 * DATABASE_ENGINE=sqlite.
 */
export function resolveSqlitePath(url: string): string {
  if (url === ":memory:") return ":memory:";
  const stripped = url.replace(/^file:/, "");
  const abs = isAbsolute(stripped) ? stripped : resolve(process.cwd(), stripped);
  if (abs !== ":memory:") {
    mkdirSync(dirname(abs), { recursive: true });
  }
  return abs;
}

function createPrismaClient(): PrismaClient {
  const dbUrl = ENV.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL is not set. " +
        (isPostgres
          ? "PostgreSQL needs a connection URL (e.g. postgresql://user:pass@host:port/db)."
          : "SQLite needs a file path (e.g. file:./data/dev.db) or ':memory:'."),
    );
  }

  // The driver adapter is the only engine-specific piece. Both engines share
  // the same generated PrismaClient type (schemas use identical Json-typed
  // columns), so the rest of the app never branches on the engine. Both
  // adapter packages are always installed (dual-engine support); importing
  // them statically keeps the client construction synchronous.
  const adapter = isPostgres
    ? new PrismaPg(
        new pg.Pool({
          connectionString: dbUrl,
          max: isDev ? 5 : 10,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        }),
      )
    : new PrismaBetterSqlite3({ url: resolveSqlitePath(dbUrl) });

  return new PrismaClient({
    adapter,
    // Only emit query events in development where the DB logger subscribes to them.
    // In production only capture errors/warnings to minimise overhead.
    log: isDev
      ? [
          { level: "query", emit: "event" },
          { level: "error", emit: "event" },
          { level: "warn", emit: "event" },
        ]
      : [
          { level: "error", emit: "event" },
          { level: "warn", emit: "event" },
        ],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (ENV.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export { dbEngine };
