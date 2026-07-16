/**
 * Pre-test orchestrator: ensures a test database exists and is migrated.
 *
 * Branches on DATABASE_ENGINE:
 *  - sqlite (default): delete any stale file (for --reset), mkdir tmp/, then
 *    `prisma migrate deploy` against it. No container to manage.
 *  - postgres: ensure the isolated *_test database in the Docker container,
 *    optionally reset it, then `prisma migrate deploy`.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { rmSync, mkdirSync, readFileSync } from "node:fs";
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

async function main() {
  const shouldReset = process.argv.includes("--reset");
  const dbUrl = process.env.TEST_DATABASE_URL!;

  console.log("\n🧪 Ensuring test database...\n");

  let connectionString = dbUrl;

  if (isPostgres) {
    const { ensureTestDatabase, dockerDb } = await import("./lib/docker-db.js");
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8"));
    const port = process.env.LOCAL_DB_DOCKER_PORT
      ? Number.parseInt(process.env.LOCAL_DB_DOCKER_PORT, 10)
      : undefined;
    if (port !== undefined && Number.isNaN(port)) {
      throw new Error(
        `LOCAL_DB_DOCKER_PORT is set to a non-numeric value "${process.env.LOCAL_DB_DOCKER_PORT}" — refusing to guess.`,
      );
    }

    const result = await ensureTestDatabase({ projectName: pkg.name, port });
    connectionString = result.connectionString;
    console.log(`✅ Test database ready: ${result.databaseName}`);
    console.log(`   Container: ${result.containerName}\n`);

    if (shouldReset) {
      console.log("🗑️  Resetting test database (drop + recreate)...\n");
      await dockerDb.reset(result.databaseName);
      console.log("✅ Test database reset!\n");
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
  await runCommand("pnpm", ["exec", "varlock", "run", "--", "prisma", "migrate", "deploy"], env);

  console.log("\n✅ Test database ready for tests!\n");
}

main().catch((err) => {
  console.error("❌ Failed to set up test database:", err);
  process.exit(1);
});
