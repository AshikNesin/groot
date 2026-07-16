import { defineConfig } from "prisma/config";
import { ENV } from "varlock/env";

export default defineConfig({
  schema: "apps/web/prisma/schema.prisma",
  migrations: {
    seed: "tsx apps/web/prisma/seed.ts",
  },
  datasource: {
    // SQLite is a single-file local database — there is no pooler to bypass,
    // so the migrate/introspection engine reads DATABASE_URL directly. Prisma 7
    // requires the connection URL here (it is no longer allowed in schema.prisma).
    url: ENV.DATABASE_URL,
  },
});
