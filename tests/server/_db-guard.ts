/**
 * Test-database safety guard.
 *
 * The test setup wipes tables for test isolation. That is correct against a
 * throwaway test database and catastrophic against production. This guard
 * makes the wrong-DB connection impossible *by construction*, branching on the
 * configured engine:
 *
 *  - sqlite: the path must resolve inside the project's `tmp/` directory (or
 *    be `:memory:`). Anything else is refused.
 *  - postgres: the URL must point at a local host AND the database name must
 *    end in `_test` (the original host-based guard).
 *
 * It must run BEFORE any Prisma import, so no connection is ever opened to a
 * non-test database.
 */

import { resolve, relative, isAbsolute } from "node:path";

const TEST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const PROD_HOST_MARKERS = ["supabase", "neon.tech", "railway.app", "render.com", "fly.dev"];
const TEST_DB_SUFFIX = "_test";

function assertSqlite(url: string): void {
  if (url === ":memory:") return;
  const stripped = url.replace(/^file:/, "");
  const cwd = process.cwd();
  const abs = isAbsolute(stripped) ? stripped : resolve(cwd, stripped);
  const rel = relative(cwd, abs);

  const insideProject = rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  if (!insideProject) {
    throw new Error(
      `Refusing to run tests: DB path '${url}' resolves outside the project directory. ` +
        "Tests TRUNCATE tables; only a path under the project is safe.",
    );
  }
  const underTmp = rel === "tmp" || rel.startsWith("tmp/") || rel.startsWith("tmp\\");
  if (!underTmp) {
    throw new Error(
      `Refusing to run tests: DB path '${url}' is not under tmp/. ` +
        "Tests TRUNCATE tables; point TEST_DATABASE_URL at ./tmp/...db (or :memory:).",
    );
  }
}

function assertPostgres(url: string): void {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`TEST_DATABASE_URL is not a valid URL: ${url}`);
  }

  if (PROD_HOST_MARKERS.some((m) => u.hostname.includes(m))) {
    throw new Error(
      `Refusing to run tests: DB host '${u.hostname}' looks like production. Tests TRUNCATE tables.`,
    );
  }

  const db = u.pathname.replace(/^\//, "");
  if (!TEST_HOSTS.has(u.hostname) || !db.endsWith(TEST_DB_SUFFIX)) {
    throw new Error(
      `Refusing to run tests on non-test DB (host=${u.hostname}, db=${db}). Tests TRUNCATE tables.`,
    );
  }
}

/**
 * Assert that `url` points at a safe test database for the configured engine.
 */
export function assertTestDatabase(url: string | undefined): void {
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Refusing to run tests — no DB is safer than the wrong DB.",
    );
  }
  const engine = (process.env.DATABASE_ENGINE ?? "sqlite").toLowerCase();
  if (engine === "postgres" || engine === "postgresql" || engine === "pg") {
    assertPostgres(url);
  } else {
    assertSqlite(url);
  }
}
