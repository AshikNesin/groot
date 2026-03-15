/**
 * Dev orchestrator script
 *
 * Automatically starts a Docker PostgreSQL container and launches the dev server.
 *
 * This is ONLY used for local development (`pnpm dev`).
 * Production uses `pnpm start` with an externally-provided DATABASE_URL.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { ensurePostgresContainer } from "./lib/docker-db.js";

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8"));

let devServer: ChildProcess | null = null;
let isShuttingDown = false;

async function main() {
  console.log("\n🗄️  Starting local development database...\n");

  const docker = await ensurePostgresContainer({
    projectName: pkg.name,
    port: process.env.LOCAL_DB_DOCKER_PORT
      ? Number.parseInt(process.env.LOCAL_DB_DOCKER_PORT, 10)
      : undefined,
  });
  const connectionString = docker.connectionString;
  console.log("🐳 Using Docker PostgreSQL\n");

  // Write connection string so `pnpm dev:studio` can pick it up
  writeFileSync(resolve(process.cwd(), ".dev-db-url"), connectionString);

  console.log("✅ Local DB ready!\n");
  console.log(`   Connection: ${connectionString}`);
  console.log("   Studio:     pnpm dev:studio (in another terminal)");
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

  // Clean up the connection string file
  try {
    unlinkSync(resolve(process.cwd(), ".dev-db-url"));
  } catch {}

  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

main().catch((err) => {
  console.error("❌ Failed to start dev environment:", err);
  process.exit(1);
});
