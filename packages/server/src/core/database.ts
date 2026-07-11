import { prisma } from "@groot/database";
import { logger } from "@groot/logger";
import { env } from "./env";

export { prisma };
export type { PrismaClient } from "@groot/database";
export { Prisma } from "@groot/database";

if (env.NODE_ENV === "development") {
  // Prisma 7's generated `PrismaClient` type doesn't expose the query-event overload
  // of `$on` directly, but the client is instantiated with `log: [{ level: "query", ... }]`
  // so the event fires at runtime. Narrow the type here to access it.
  (
    prisma as {
      $on(event: "query", listener: (e: { query: string; duration: number }) => void): void;
    }
  ).$on("query", (event) => {
    logger.debug({ query: event.query, duration: `${event.duration}ms` }, "DB query");
  });
}
