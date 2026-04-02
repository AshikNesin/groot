import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { logger } from "@/core/logger";
import { env } from "@/core/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });

  return new PrismaClient({
    adapter,
    log: [
      { level: "query", emit: "event" },
      { level: "error", emit: "event" },
      { level: "warn", emit: "event" },
    ],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

if (env.NODE_ENV === "development") {
  prisma.$on("query", (event) => {
    logger.debug({ query: event.query, duration: `${event.duration}ms` }, "DB query");
  });
}

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
