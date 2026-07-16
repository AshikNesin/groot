/**
 * Dev orchestrator script.
 *
 * Branches on DATABASE_ENGINE:
 *  - sqlite (default): just mkdir the data dir, migrate, seed, start tsx.
 *  - postgres: start/ensure the local Docker container, detect db-push drift,
 *    migrate, seed, start tsx. (Original behaviour.)
 */

import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve, isAbsolute } from "node:path";
import { isPostgres } from "../packages/core/src/database/engine.ts";

let devServer: ChildProcess | null = null;
let isShuttingDown = false;

/** Resolve a SQLite DATABASE_URL to an absolute filesystem path (or null for :memory:). */
function dbFilePath(url: string): string | null {
  if (url === ":memory:") return null;
  const stripped = url.replace(/^file:/, "");
  return isAbsolute(stripped) ? stripped : resolve(process.cwd(), stripped);
}

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise<void>((resolvePromise, reject) => {
    const proc = spawn(cmd, args, { stdio: "inherit", env });
    proc.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

async function main() {
  const connectionString = process.env.DATABASE_URL!;

  if (isPostgres) {
    const { ensurePostgresContainer, databaseHasTables, databaseHasMigrationHistory, dockerDb } =
      await import("./lib/docker-db.js");
    const { readFileSync } = await import("node:fs");
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8"));

    console.log("\n🗄️  Starting local PostgreSQL database...\n");
    const docker = await ensurePostgresContainer({
      projectName: pkg.name,
      port: process.env.LOCAL_DB_DOCKER_PORT
        ? Number.parseInt(process.env.LOCAL_DB_DOCKER_PORT, 10)
        : undefined,
    });
    // connectionString already resolved by varlock to the same Docker DB.
    console.log("🐳 Using Docker PostgreSQL\n");

    // Detect a db-push-managed database and reset it so `migrate deploy` works.
    const hasTables = await databaseHasTables(docker.databaseName);
    const hasMigrations = await databaseHasMigrationHistory(docker.databaseName);
    if (hasTables && !hasMigrations) {
      console.log(
        "⚠️  Database has tables but no Prisma migration history (was `db push` managed).",
      );
      console.log("   Resetting local dev database so migrations apply cleanly...\n");
      await dockerDb.reset(docker.databaseName);
      console.log("   ✅ Database reset.\n");
    }
  } else {
    console.log("\n🗄️  Using SQLite database\n");
    const filePath = dbFilePath(connectionString);
    if (filePath) {
      mkdirSync(dirname(filePath), { recursive: true });
    }
  }

  console.log(`   Connection: ${connectionString}`);
  console.log();

  // Apply migrations to the local DB (no db push — that bypasses migration history)
  console.log("📦 Applying Prisma migrations...\n");
  await run("pnpm", ["exec", "varlock", "run", "--", "prisma", "migrate", "deploy"], {
    ...process.env,
    DATABASE_URL: connectionString,
  });

  // Seed default user for local development
  console.log("\n👤 Seeding default user...");
  await run("pnpm", ["exec", "varlock", "run", "--", "tsx", "apps/web/prisma/seed.ts"], {
    ...process.env,
    DATABASE_URL: connectionString,
  });

  console.log("\n🚀 Starting dev server...\n");

  // Spawn the actual dev server with the local DB URL
  devServer = spawn(
    "node_modules/.bin/tsx",
    [
      // `watch` MUST be the first arg — it's a tsx subcommand, not a flag. If a
      // node flag (--max-old-space-size) precedes it, tsx enters "flags + script"
      // mode and treats `watch` as a file path (ERR_MODULE_NOT_FOUND).
      "watch",
      // Cap V8 old-space to 512 MB in dev. Node's default is ~1.5 GB which is
      // far beyond what this server ever needs. Setting a tighter ceiling lets
      // GC run more aggressively and keeps the process footprint honest.
      "--max-old-space-size=512",
      "apps/web/src/server/index.ts",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "development",
        DATABASE_URL: connectionString,
      },
    },
  );

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
