/**
 * SQLite test-database safety guard.
 *
 * The test setup wipes tables for test isolation. That is correct against a
 * local throwaway SQLite file and catastrophic against a production database.
 * This guard makes the wrong-DB connection impossible *by construction*: it
 * only accepts paths that resolve inside the project's `tmp/` directory (or
 * the `:memory:` sentinel), and refuses anything else. It must run BEFORE any
 * Prisma import, so no connection is ever opened to a non-test database.
 */

import { resolve, relative, isAbsolute } from "node:path";

const MEMORY = ":memory:";

/**
 * Assert that `url` points at a safe test database. Throws on any sign of a
 * non-test target.
 *
 * Accepts:
 *   - ":memory:"
 *   - "file:./tmp/test.db" or "./tmp/test.db" (resolved under project tmp/)
 *   - an absolute path inside the project's tmp/ directory
 *
 * @param url The TEST_DATABASE_URL to validate.
 */
export function assertTestDatabase(url: string | undefined, _expectedDb?: string): void {
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Refusing to run tests — no DB is safer than the wrong DB.",
    );
  }

  if (url === MEMORY) return;

  const stripped = url.replace(/^file:/, "");
  const cwd = process.cwd();
  const abs = isAbsolute(stripped) ? stripped : resolve(cwd, stripped);
  const rel = relative(cwd, abs);

  // Refuse anything that escapes the project dir (e.g. ".." traversal or an
  // absolute path outside cwd) — those are almost certainly operator mistakes.
  const insideProject = rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  if (!insideProject) {
    throw new Error(
      `Refusing to run tests: DB path '${url}' resolves outside the project directory. ` +
        `Tests TRUNCATE tables; only a path under the project is safe.`,
    );
  }

  // Require the file to live under tmp/ so dev/prod SQLite files are never touched.
  const underTmp = rel === "tmp" || rel.startsWith("tmp" + "/") || rel.startsWith("tmp\\");
  if (!underTmp) {
    throw new Error(
      `Refusing to run tests: DB path '${url}' is not under tmp/. ` +
        `Tests TRUNCATE tables; point TEST_DATABASE_URL at ./tmp/...db (or :memory:).`,
    );
  }
}
