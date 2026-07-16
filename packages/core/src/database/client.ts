import "varlock/auto-load";
import { ENV } from "varlock/env";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const isDev = ENV.NODE_ENV === "development";

/**
 * Resolve the SQLite database file path from DATABASE_URL.
 *
 * DATABASE_URL holds a plain file path (e.g. `./data/app.db`) or the
 * `:memory:` sentinel. We accept an optional `file:` prefix for parity with
 * Prisma's `file:./dev.db` URL convention and strip it before handing the raw
 * path to better-sqlite3. A relative path is resolved against `process.cwd()`
 * and the parent directory is created on demand so a fresh checkout "just
 * works" without the operator having to `mkdir` the data dir.
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
      "DATABASE_URL is not set. SQLite needs a file path (e.g. file:./data/dev.db) or ':memory:'.",
    );
  }
  const dbPath = resolveSqlitePath(dbUrl);
  const adapter = new PrismaBetterSqlite3({ url: dbPath });

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
