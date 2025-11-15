import { PrismaClient } from "@/generated/prisma";
import { logger } from "@/core/logger";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [
      { level: "query", emit: "event" },
      { level: "error", emit: "event" },
      { level: "warn", emit: "event" },
    ],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (event) => {
    logger.debug({ query: event.query, duration: `${event.duration}ms` }, "DB query");
  });
}

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
