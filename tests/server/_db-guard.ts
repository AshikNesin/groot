/**
 * Host-based test-database safety guard.
 *
 * The test setup wipes tables for test isolation. That is correct against a
 * local test database and catastrophic against production. This guard makes
 * the wrong-DB connection impossible *by construction*: it parses the URL and
 * throws unless the host is explicitly local AND the database name looks like
 * a test DB. It must run BEFORE any Prisma import, so no connection is ever
 * opened to a non-test database.
 *
 * Unlike a string-equality check against DATABASE_URL (which silently no-ops
 * when DATABASE_URL is loaded from a secret manager and has no .env line),
 * this is structural: a prod host or a non-test db name is refused regardless
 * of how the URL was provided.
 */

const TEST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const PROD_HOST_MARKERS = ["supabase", "neon.tech", "railway.app", "render.com", "fly.dev"];
const TEST_DB_SUFFIX = "_test";

/**
 * Assert that `url` points at a safe test database. Throws on any sign of a
 * non-test target.
 *
 * @param url The TEST_DATABASE_URL to validate.
 * @param expectedDb Optional exact database name (e.g. `myapp_test`). When
 *   omitted, any name ending in `_test` is accepted so the boilerplate stays
 *   project-agnostic.
 */
export function assertTestDatabase(url: string | undefined, expectedDb?: string): void {
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Refusing to run tests — no DB is safer than the wrong DB.",
    );
  }

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
  const dbOk = expectedDb ? db === expectedDb : db.endsWith(TEST_DB_SUFFIX);
  if (!TEST_HOSTS.has(u.hostname) || !dbOk) {
    throw new Error(
      `Refusing to run tests on non-test DB (host=${u.hostname}, db=${db}). Tests TRUNCATE tables.`,
    );
  }
}
