/**
 * Dev orchestrator script
 *
 * Automatically starts a local database and launches the dev server.
 *
 * Database mode (auto-detected, can be overridden via LOCAL_DB_MODE env var):
 * - Docker PostgreSQL: Multi-connection support (Prisma Studio, job queue, etc.)
 * - PGlite: Zero-config fallback (single connection limit)
 *
 * This is ONLY used for local development (`pnpm dev`).
 * Production uses `pnpm start` with an externally-provided DATABASE_URL.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { startPrismaDevServer } from "@prisma/dev";
import { isDockerAvailable, ensurePostgresContainer } from "./lib/docker-db.js";

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8"));
const dbName = `${pkg.name}-db`;

let devServer: ChildProcess | null = null;
let dbServer: Awaited<ReturnType<typeof startPrismaDevServer>> | null = null;
let isShuttingDown = false;

type DbMode = "docker" | "pglite";

/**
 * Resolve database mode: env var override > auto-detect > fallback
 */
async function resolveDbMode(): Promise<DbMode> {
  const envMode = process.env.LOCAL_DB_MODE;

  if (envMode === "docker") return "docker";
  if (envMode === "pglite") return "pglite";

  // Auto-detect: use Docker if available
  if (await isDockerAvailable()) return "docker";

  return "pglite";
}

async function main() {
  console.log("\n🗄️  Starting local development database...\n");

  const mode = await resolveDbMode();
  let connectionString!: string; // Definite assignment - always set in one of the branches below
  let dbMode: DbMode = mode;

  if (mode === "docker") {
    try {
      const docker = await ensurePostgresContainer({
        projectName: pkg.name,
        port: process.env.LOCAL_DB_DOCKER_PORT
          ? Number.parseInt(process.env.LOCAL_DB_DOCKER_PORT, 10)
          : undefined,
      });
      connectionString = docker.connectionString;
      console.log("🐳 Using Docker PostgreSQL (auto-detected)\n");
    } catch (err) {
      console.warn("⚠️  Docker PostgreSQL failed, falling back to PGlite:");
      console.warn(`   ${err instanceof Error ? err.message : err}\n`);
      dbMode = "pglite";
    }
  }

  if (dbMode === "pglite") {
    // Start local PGlite-based Postgres
    dbServer = await startPrismaDevServer({
      name: dbName,
      persistenceMode: "stateful", // Data persists between runs
    });
    connectionString = dbServer.database.connectionString;
    console.log("📦 Using PGlite (Docker not available or disabled)\n");
  }

  // Write connection string so `pnpm dev:studio` can pick it up
  writeFileSync(resolve(process.cwd(), ".dev-db-url"), connectionString);

  console.log("✅ Local DB ready!\n");
  console.log(`   Connection: ${connectionString}`);
  if (dbServer?.ppg?.url) {
    console.log(`   Prisma URL: ${dbServer.ppg.url}`);
  }
  if (dbMode === "docker") {
    console.log("   Studio:     pnpm dev:studio (in another terminal)");
    console.log("   Job Queue:  Set ENABLE_JOB_QUEUE=true in .env");
  } else {
    console.log("   Note:       Single-connection mode (PGlite)");
  }
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

  // Determine if job queue should be enabled
  // Default: enabled for Docker (multi-connection), disabled for PGlite (single connection)
  const defaultJobQueue = dbMode === "docker" ? "true" : "false";

  // Spawn the actual dev server with the local DB URL
  devServer = spawn("tsx", ["watch", "server/src/index.ts"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      DATABASE_URL: connectionString,
      LOCAL_DB_MODE: dbMode,
      // Job queue: enabled by default for Docker, disabled for PGlite
      // User can override by setting ENABLE_JOB_QUEUE in .env
      ENABLE_JOB_QUEUE: process.env.ENABLE_JOB_QUEUE ?? defaultJobQueue,
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

  if (dbServer?.close) {
    try {
      await dbServer.close();
    } catch {
      // PGlite close errors are expected during termination, ignore them
    }
    dbServer = null;
    console.log("   Local DB stopped.");
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
