import { defineConfig } from "prisma/config";
import { ENV } from "varlock/env";
import { dbEngine } from "./packages/core/src/database/engine.ts";

// The active Prisma schema + migrations directory are selected by
// DATABASE_ENGINE (sqlite by default, postgres to opt in). Both schemas share
// identical model definitions and Json-typed array/JSON columns, so the
// generated client is type-identical regardless of engine — app code never
// branches on the engine.
const schemaPath =
  dbEngine === "postgres"
    ? "apps/web/prisma/schema.postgres.prisma"
    : "apps/web/prisma/schema.sqlite.prisma";
const migrationsPath =
  dbEngine === "postgres"
    ? "apps/web/prisma/migrations-postgres"
    : "apps/web/prisma/migrations-sqlite";

export default defineConfig({
  schema: schemaPath,
  migrations: {
    path: migrationsPath,
    seed: "tsx apps/web/prisma/seed.ts",
  },
  datasource: {
    // SQLite reads DATABASE_URL directly. For pooled Postgres the migrate
    // engine needs a session-mode (direct) connection — DATABASE_URL_DIRECT
    // bypasses the pooler when set, else falls back to DATABASE_URL.
    url: dbEngine === "postgres" ? ENV.DATABASE_URL_DIRECT || ENV.DATABASE_URL : ENV.DATABASE_URL,
  },
});
