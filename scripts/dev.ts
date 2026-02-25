/**
 * Dev orchestrator script
 *
 * Automatically starts a local Prisma Postgres instance (PGlite),
 * pushes the schema, and launches the dev server.
 *
 * This is ONLY used for local development (`pnpm dev`).
 * Production uses `pnpm start` with an externally-provided DATABASE_URL.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { startPrismaDevServer } from "@prisma/dev";

const pkg = JSON.parse(
	readFileSync(resolve(process.cwd(), "package.json"), "utf-8"),
);
const dbName = `${pkg.name}-db`;

let devServer: ChildProcess | null = null;
let dbServer: Awaited<ReturnType<typeof startPrismaDevServer>> | null = null;
let isShuttingDown = false;

async function main() {
	console.log(`\n🗄️  Starting local Prisma Postgres (${dbName})...\n`);

	// Start local PGlite-based Postgres
	dbServer = await startPrismaDevServer({
		name: dbName,
		persistenceMode: "stateful", // Data persists between runs
	});

	const connectionString = dbServer.database.connectionString;
	console.log("✅ Local DB ready!\n");
	console.log(`   TCP URL:    ${connectionString}`);
	console.log(`   Prisma URL: ${dbServer.ppg.url}\n`);

	// Push schema to the local DB
	console.log("📦 Pushing Prisma schema...\n");
	await new Promise<void>((resolvePromise, reject) => {
		const push = spawn(
			"npx",
			["prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
			{
				stdio: "inherit",
				env: { ...process.env, DATABASE_URL: connectionString },
			},
		);
		push.on("close", (code) => {
			if (code === 0) resolvePromise();
			else reject(new Error(`prisma db push exited with code ${code}`));
		});
		push.on("error", reject);
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

	if (dbServer?.close) {
		try {
			await dbServer.close();
		} catch {
			// PGlite close errors are expected during termination, ignore them
		}
		dbServer = null;
		console.log("   Local DB stopped.");
	}

	process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

main().catch((err) => {
	console.error("❌ Failed to start dev environment:", err);
	process.exit(1);
});
