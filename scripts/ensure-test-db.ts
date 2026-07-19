/**
 * Pre-test orchestrator: ensures a test database exists and is migrated.
 *
 * Branches on DATABASE_ENGINE:
 *  - sqlite (default): delete any stale file (for --reset), mkdir tmp/, then
 *    `prisma migrate deploy` against it. No container to manage.
 *  - postgres: the caller provisions the test DB (CI service container, or an
 *    external Postgres reached via DATABASE_URL). This script only resets it
 *    (when asked) and runs `prisma migrate deploy`. It no longer manages a
 *    local Docker container — run your own Postgres and point DATABASE_URL at it.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { rmSync, mkdirSync } from "node:fs";
import { dirname, resolve, isAbsolute } from "node:path";
import { isPostgres } from "../packages/core/src/database/engine.ts";

function runCommand(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise<void>((resolvePromise, reject) => {
    const proc: ChildProcess = spawn(cmd, args, {
      stdio: "inherit",
      env,
    });
    proc.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

/** Resolve a SQLite DATABASE_URL to an absolute filesystem path (or null for :memory:). */
function dbFilePath(url: string): string | null {
  if (url === ":memory:") return null;
  const stripped = url.replace(/^file:/, "");
  return isAbsolute(stripped) ? stripped : resolve(process.cwd(), stripped);
}

/** Drop and recreate a Postgres database by connecting with the `pg` driver. */
async function resetPostgresDatabase(connectionString: string): Promise<void> {
  // Resolve `pg` from @groot/core (it's a dependency there, not at the repo root).
  const { createRequire } = await import("node:module");
  const requireFromHere = createRequire(import.meta.url);
  const pgPath = requireFromHere.resolve("pg", {
    paths: [`${process.cwd()}/packages/core`],
  });
  const { Client } = await import(pgPath);

  const url = new URL(connectionString);
  const dbName = url.pathname.replace(/^\//, "");
  if (!dbName) throw new Error(`Cannot derive database name from ${connectionString}`);

  // Connect to the maintenance DB ("postgres") to drop+recreate.
  const adminUrl = new URL(connectionString);
  adminUrl.pathname = "/postgres";
  const admin = new Client({
    connectionString: adminUrl.toString(),
    connectionTimeoutMillis: 5000,
  });
  await admin.connect();
  try {
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName],
    );
    await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await admin.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await admin.end();
  }
}

async function main() {
  const shouldReset = process.argv.includes("--reset");
  const dbUrl = process.env.TEST_DATABASE_URL!;

  console.log("\n🧪 Ensuring test database...\n");

  let connectionString = dbUrl;

  if (isPostgres) {
    console.log(`✅ Using external Postgres: ${dbUrl}\n`);
    if (shouldReset) {
      console.log("🗑️  Resetting test database (drop + recreate)...\n");
      await resetPostgresDatabase(dbUrl);
      console.log("   ✅ Test database reset!\n");
    }
  } else {
    const filePath = dbFilePath(dbUrl);
    if (filePath) {
      mkdirSync(dirname(filePath), { recursive: true });
      if (shouldReset) {
        console.log("🗑  Resetting test database (deleting file)...\n");
        rmSync(filePath, { force: true });
        rmSync(`${filePath}-wal`, { force: true });
        rmSync(`${filePath}-shm`, { force: true });
        console.log("   ✅ Test database reset!\n");
      }
    }
    console.log(`✅ Test database path: ${dbUrl}\n`);
  }

  // Apply migrations. We pin DATABASE_URL (and for Postgres, DATABASE_URL_DIRECT)
  // so an ambient value can't divert migrations away from the test DB.
  console.log("📦 Applying Prisma migrations to test database...\n");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: connectionString,
    TEST_DATABASE_URL: connectionString,
  };
  if (isPostgres) {
    env.DATABASE_URL_DIRECT = connectionString;
  }

  // Regenerate the Prisma client for the active engine. The generated client
  // embeds the datasource provider (sqlite vs postgres), so a client generated
  // for one engine is incompatible with the other engine's driver adapter at
  // runtime ("Driver Adapter ... is not compatible with the provider ...").
  // The postinstall hook generates for whatever engine was active at install
  // time; switching engines requires regenerating.
  console.log("🔧 Regenerating Prisma client for the active engine...\n");
  await runCommand("pnpm", ["exec", "varlock", "run", "--", "prisma", "generate"], env);

  await runCommand("pnpm", ["exec", "varlock", "run", "--", "prisma", "migrate", "deploy"], env);

  console.log("\n✅ Test database ready for tests!\n");
}

main().catch((err) => {
  console.error("❌ Failed to set up test database:", err);
  process.exit(1);
});
