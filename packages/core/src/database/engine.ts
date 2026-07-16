import "varlock/auto-load";
import { ENV } from "varlock/env";

/**
 * Which database engine this process is configured to use.
 *
 * `DATABASE_ENGINE=sqlite` (default) → a single local file via better-sqlite3.
 * `DATABASE_ENGINE=postgres`        → a PostgreSQL server via @prisma/adapter-pg.
 *
 * The value is read once at module load and frozen. Every database-aware
 * module (Prisma client, KV store, prisma.config.ts, the dev/test scripts)
 * routes through {@link dbEngine} / {@link isPostgres} / {@link isSqlite} so the
 * branch lives in exactly one place.
 */
export type DbEngine = "sqlite" | "postgres";

function parseEngine(raw: string | undefined): DbEngine {
  const v = (raw ?? "sqlite").trim().toLowerCase();
  if (v === "postgres" || v === "postgresql" || v === "pg") return "postgres";
  if (v === "sqlite") return "sqlite";
  // Unknown value: fail loud rather than silently falling back — a typo in
  // DATABASE_ENGINE should never accidentally point a prod-shaped Postgres URL
  // at the SQLite code path (or vice versa).
  throw new Error(
    `DATABASE_ENGINE="${raw}" is not supported. Use "sqlite" (default) or "postgres".`,
  );
}

export const dbEngine: DbEngine = parseEngine(ENV.DATABASE_ENGINE);
export const isPostgres = dbEngine === "postgres";
export const isSqlite = dbEngine === "sqlite";
