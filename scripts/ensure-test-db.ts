/**
 * Pre-test orchestrator: ensures a test database exists and is migrated.
 *
 * The test DB (`${projectName}_test`) lives in the SAME Docker container
 * as the dev DB (groot-local-dev-db, port 5433) but as a separate database.
 * This means:
 *   - No separate container to manage
 *   - Same credentials as dev
 *   - Fully isolated at the database level (tests can never touch dev data)
 *
 * This is the test equivalent of scripts/dev.ts.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensureTestDatabase, dockerDb } from "./lib/docker-db.js";

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8"));

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

async function main() {
  const shouldReset = process.argv.includes("--reset");

  console.log("\n🧪 Ensuring test database...\n");

  const port = process.env.LOCAL_DB_DOCKER_PORT
    ? Number.parseInt(process.env.LOCAL_DB_DOCKER_PORT, 10)
    : undefined;
  if (port !== undefined && Number.isNaN(port)) {
    throw new Error(
      `LOCAL_DB_DOCKER_PORT is set to a non-numeric value "${process.env.LOCAL_DB_DOCKER_PORT}" — refusing to guess.`,
    );
  }

  const result = await ensureTestDatabase({ projectName: pkg.name, port });

  console.log(`✅ Test database ready: ${result.databaseName}`);
  console.log(`   Container: ${result.containerName}`);
  console.log();

  if (shouldReset) {
    console.log("🗑️  Resetting test database (drop + recreate)...\n");
    await dockerDb.reset(result.databaseName);
    console.log("✅ Test database reset!\n");
  }

  // Apply migrations to the test DB. NODE_ENV=test makes varlock resolve
  // DATABASE_URL to the *_test DB (via the forEnv(test) branch in .env.schema),
  // and prisma.config.ts reads ENV.DATABASE_URL — so without NODE_ENV=test the
  // migrate engine silently targets the dev DB instead. DATABASE_URL_DIRECT is
  // pinned too because prisma.config.ts prefers it over DATABASE_URL, and an
  // ambient DIRECT value (e.g. a staging direct URL) would otherwise divert
  // migrations away from the test DB.
  console.log("📦 Applying Prisma migrations to test database...\n");
  await runCommand("pnpm", ["exec", "varlock", "run", "--", "prisma", "migrate", "deploy"], {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: result.connectionString,
    DATABASE_URL_DIRECT: result.connectionString,
    TEST_DATABASE_URL: result.connectionString,
  });

  console.log("\n✅ Test database ready for tests!\n");
}

main().catch((err) => {
  console.error("❌ Failed to set up test database:", err);
  process.exit(1);
});
