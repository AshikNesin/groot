/**
 * Dev orchestrator script
 *
 * Intelligently manages database connections for local development:
 * - If DATABASE_URL is not set or contains "localhost": uses Docker PostgreSQL
 * - If DATABASE_URL points to an external database: uses it directly
 *
 * This is ONLY used for local development (`pnpm dev`).
 * Production uses `pnpm start` with an externally-provided DATABASE_URL.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensurePostgresContainer } from "./lib/docker-db.js";

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8"));

let devServer: ChildProcess | null = null;
let isShuttingDown = false;

/**
 * Determine if we should use Docker-based database.
 * Returns true if DATABASE_URL is not set or contains "localhost".
 * Returns false if DATABASE_URL points to an external database.
 */
function shouldUseDocker(): boolean {
  return !process.env.DATABASE_URL;
}

/**
 * Extract host from a database URL for display purposes
 */
function extractHost(dbUrl: string): string {
  try {
    const url = new URL(dbUrl);
    return url.host;
  } catch {
    return dbUrl;
  }
}

async function main() {
  let connectionString: string;
  const useDocker = shouldUseDocker();

  if (useDocker) {
    console.log("\n🗄️  Starting local development database...\n");

    const docker = await ensurePostgresContainer({
      projectName: pkg.name,
      port: process.env.LOCAL_DB_DOCKER_PORT
        ? Number.parseInt(process.env.LOCAL_DB_DOCKER_PORT, 10)
        : undefined,
    });
    connectionString = docker.connectionString;
    console.log("🐳 Using Docker PostgreSQL\n");
  } else {
    connectionString = process.env.DATABASE_URL!;
    const host = extractHost(connectionString);
    console.log(`\n🔌 Using external database: ${host}\n`);
  }

  console.log("✅ Database ready!\n");
  console.log(`   Connection: ${connectionString}`);
  console.log();

  // Push schema to the local DB
  console.log("📦 Pushing Prisma schema...\n");
  await new Promise<void>((resolvePromise, reject) => {
    const push = spawn("pnpm", ["exec", "prisma", "db", "push", "--accept-data-loss"], {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: connectionString },
    });
    push.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`prisma db push exited with code ${code}`));
    });
    push.on("error", reject);
  });

  // Seed default user for local development
  console.log("\n👤 Seeding default user...");
  console.log("   📧 Email:    test@test.com");
  console.log("   🔑 Password: password\n");
  await new Promise<void>((resolvePromise, reject) => {
    const seed = spawn("tsx", ["scripts/seed-user.ts"], {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: connectionString },
    });
    seed.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`seed-user exited with code ${code}`));
    });
    seed.on("error", reject);
  });

  console.log("\n🚀 Starting dev server...\n");

  // Spawn the actual dev server with the local DB URL
  devServer = spawn("tsx", ["watch", "server/src/index.ts"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      DATABASE_URL: connectionString,
    },
  });

  devServer.on("close", (code) => {
    if (!isShuttingDown) {
      console.error(`\n❌ Dev server exited unexpectedly (code ${code})`);
      void shutdown();
    }
  });
}

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("\n🛑 Shutting down...");

  if (devServer && !devServer.killed) {
    devServer.kill("SIGTERM");
    devServer = null;
  }

  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

main().catch((err) => {
  console.error("❌ Failed to start dev environment:", err);
  process.exit(1);
});
