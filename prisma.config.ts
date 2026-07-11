import { defineConfig } from "prisma/config";
import { ENV } from "varlock/env";

export default defineConfig({
  schema: "apps/web/prisma/schema.prisma",
  migrations: {
    seed: "tsx apps/web/prisma/seed.ts",
  },
  datasource: {
    // The migrate/introspection engine needs a session-mode (direct) connection.
    // It is incompatible with transaction-mode poolers (e.g. Supabase Supavisor /
    // PgBouncer), which fail with "prepared statement already exists" and can
    // hang past platform boot timeouts. When DATABASE_URL_DIRECT is set it
    // bypasses the pooler; when unset (dev with a plain local Postgres) it
    // falls back to DATABASE_URL. The runtime client uses the pooled URL
    // separately via @prisma/adapter-pg in server/src/core/database.ts.
    url: ENV.DATABASE_URL_DIRECT || ENV.DATABASE_URL,
  },
});
