import { prisma } from "@groot/database";
import { logger } from "@groot/logger";
import { env } from "./env";

export { prisma };
export type { PrismaClient } from "@groot/database";
export { Prisma } from "@groot/database";

if (env.NODE_ENV === "development") {
  prisma.$on("query", (event) => {
    logger.debug({ query: event.query, duration: `${event.duration}ms` }, "DB query");
  });
}
