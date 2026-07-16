/**
 * Pre-test orchestrator: ensures a SQLite test database exists and is migrated.
 *
 * SQLite stores the whole database in a single file, so "ensuring" the test
 * DB is just: delete any stale file (for `--reset`), create the parent dir,
 * then run `prisma migrate deploy` against it. There is no container to
 * manage — this is the test equivalent of scripts/dev.ts.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { rmSync, mkdirSync } from "node:fs";
import { dirname, resolve, isAbsolute } from "node:path";

const DEFAULT_TEST_DB = "file:./tmp/test.db";

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

/** Resolve a SQLite DATABASE_URL to an absolute filesystem path (or :memory:). */
function dbFilePath(url: string): string | null {
  if (url === ":memory:") return null;
  const stripped = url.replace(/^file:/, "");
  return isAbsolute(stripped) ? stripped : resolve(process.cwd(), stripped);
}

async function main() {
  const shouldReset = process.argv.includes("--reset");

  const dbUrl = process.env.TEST_DATABASE_URL || DEFAULT_TEST_DB;
  console.log("\n🧪 Ensuring SQLite test database...\n");

  const filePath = dbFilePath(dbUrl);
  if (filePath) {
    mkdirSync(dirname(filePath), { recursive: true });
    if (shouldReset) {
      console.log("🗑  Resetting test database (deleting file)...\n");
      rmSync(filePath, { force: true });
      // Also remove SQLite sidecar files (-wal, -shm) left by WAL mode.
      rmSync(`${filePath}-wal`, { force: true });
      rmSync(`${filePath}-shm`, { force: true });
      console.log("   ✅ Test database reset!\n");
    }
  }

  console.log(`✅ Test database path: ${dbUrl}\n`);

  // Apply migrations. NODE_ENV=test makes varlock resolve DATABASE_URL to the
  // test file (via the forEnv(test) branch in .env.schema). We also pin
  // DATABASE_URL explicitly so an ambient value can't divert migrations.
  console.log("📦 Applying Prisma migrations to test database...\n");
  await runCommand("pnpm", ["exec", "varlock", "run", "--", "prisma", "migrate", "deploy"], {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: dbUrl,
    TEST_DATABASE_URL: dbUrl,
  });

  console.log("\n✅ Test database ready for tests!\n");
}

main().catch((err) => {
  console.error("❌ Failed to set up test database:", err);
  process.exit(1);
});
