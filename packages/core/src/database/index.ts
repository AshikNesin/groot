import { prisma } from "./client";
import { logger } from "@groot/core/logger";
import { ENV } from "varlock/env";

export { prisma };
export type { PrismaClient } from "./types";
export { Prisma } from "./types";
export type { User, Passkey, Todo, JobLog } from "./types";

if (ENV.NODE_ENV === "development") {
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
