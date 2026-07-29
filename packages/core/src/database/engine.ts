import "varlock/auto-load";
import { ENV } from "varlock/env";

/**
 * Which database engine this process is configured to use.
 *
 * Inferred automatically from the `DATABASE_URL` scheme — there is no separate
 * `DATABASE_ENGINE` knob to keep in sync:
 *
 * - `postgresql://...` / `postgres://...` → Postgres via @prisma/adapter-pg
 * - anything else (`file:...`, a bare path, `:memory:`) → SQLite via
 *   better-sqlite3
 *
 * The value is read once at module load and frozen. Every database-aware
 * module (Prisma client, KV store, prisma.config.ts, the dev/test scripts)
 * routes through {@link dbEngine} / {@link isPostgres} / {@link isSqlite} so the
 * branch lives in exactly one place.
 */
export type DbEngine = "sqlite" | "postgres";

/**
 * Derive the engine from the connection URL, not a separate env var.
 *
 * `postgresql://` and `postgres://` (the two URI schemes Prisma/Node use for
 * Postgres) select Postgres. Everything else is treated as SQLite — a `file:`
 * path, a bare filesystem path, or `:memory:`. When no URL is set we default
 * to sqlite; callers that require a URL (e.g. Postgres) surface a clear error.
 */
function inferEngine(dbUrl: string | undefined): DbEngine {
  if (!dbUrl) return "sqlite";
  return dbUrl.trim().startsWith("postgres") ? "postgres" : "sqlite";
}

export const dbEngine: DbEngine = inferEngine(ENV.DATABASE_URL);
export const isPostgres = dbEngine === "postgres";
export const isSqlite = dbEngine === "sqlite";
