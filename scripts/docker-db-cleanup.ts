/**
 * Docker Database Cleanup CLI
 *
 * Manages the local Docker PostgreSQL container for development.
 *
 * Usage:
 *   pnpm dev:db:docker:stop   - Stop container (keeps data)
 *   pnpm dev:db:ocker:reset   - Drop and recreate database (fresh start)
 */

import {
	dockerDb,
	isDockerAvailable,
} from "./lib/docker-db.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pkg = JSON.parse(
	readFileSync(resolve(process.cwd(), "package.json"), "utf-8"),
);
const dbName = pkg.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

async function main() {
	const args = process.argv.slice(2);
	const command = args[0];

	// Check Docker availability
	if (!(await isDockerAvailable())) {
		console.error("❌ Docker is not available. Is Docker running?");
		process.exit(1);
	}

	switch (command) {
		case "--stop":
			await handleStop();
			break;
		case "--reset":
			await handleReset();
			break;
		case "--status":
			await handleStatus();
			break;
		default:
			console.log("Usage:");
			console.log("  tsx scripts/docker-db-cleanup.ts --stop    Stop container (keeps data)");
			console.log("  tsx scripts/docker-db-cleanup.ts --reset   Drop and recreate database");
			console.log("  tsx scripts/docker-db-cleanup.ts --status  Show container status");
			process.exit(1);
	}
}

async function handleStop() {
	console.log("🛑 Stopping Docker PostgreSQL container...\n");

	if (!(await dockerDb.exists())) {
		console.log("   Container doesn't exist. Nothing to stop.");
		return;
	}

	if (!(await dockerDb.isRunning())) {
		console.log("   Container is already stopped.");
		return;
	}

	await dockerDb.stop();
	console.log("✅ Container stopped. Data preserved.\n");
	console.log("   Run `pnpm dev` to start it again.");
}

async function handleReset() {
	console.log("🔄 Resetting Docker PostgreSQL database...\n");

	if (!(await dockerDb.exists())) {
		console.log("   Container doesn't exist. Run `pnpm dev` first.");
		return;
	}

	if (!(await dockerDb.isRunning())) {
		console.log("   Container is not running. Start it first with `pnpm dev`.");
		return;
	}

	await dockerDb.reset(dbName);
	console.log(`✅ Database "${dbName}" reset.\n`);
	console.log("   Run `pnpm dev` to push schema and start the server.");
}

async function handleStatus() {
	console.log("📊 Docker PostgreSQL Status\n");

	const exists = await dockerDb.exists();
	const running = exists ? await dockerDb.isRunning() : false;
	const port = running ? await dockerDb.getPort() : null;

	console.log(`   Container exists: ${exists ? "✅" : "❌"}`);
	console.log(`   Container running: ${running ? "✅" : "❌"}`);
	if (port) {
		console.log(`   Mapped port: ${port}`);
		console.log(`   Database: ${dbName}`);
		console.log(`   Connection: postgresql://postgres:postgres@localhost:${port}/${dbName}`);
	}

	if (!exists) {
		console.log("\n   Run `pnpm dev` to create the container.");
	} else if (!running) {
		console.log("\n   Container is stopped. Run `pnpm dev` to start it.");
	}
}

main().catch((err) => {
	console.error("❌ Error:", err.message);
	process.exit(1);
});
