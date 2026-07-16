import "varlock/auto-load";
import { ENV } from "varlock/env";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Shared pg Pool: capped to avoid holding idle connections unnecessarily.
// PrismaPg, Keyv, and pg-boss each open their own pool by default (pg default
// max=10 each = 30 idle connections). Prisma accepts an external Pool so we
// can size it explicitly and share it across the Prisma adapter.
const isDev = ENV.NODE_ENV === "development";
const pgPool = new pg.Pool({
  connectionString: ENV.DATABASE_URL,
  max: isDev ? 5 : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(pgPool);

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

// Export the shared pool so other modules (e.g. KV store) can reuse it.
export { pgPool };

process.on("beforeExit", async () => {
  await prisma.$disconnect();
  await pgPool.end();
});
