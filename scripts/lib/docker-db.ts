/**
 * Docker PostgreSQL Manager for Local Development
 *
 * Provides multi-connection PostgreSQL support via Docker.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const CONTAINER_NAME = "groot-local-dev-db";
const POSTGRES_USER = "postgres";
const POSTGRES_PASSWORD = "postgres";
const DEFAULT_PORT = 5433;
const POSTGRES_IMAGE = "pgvector/pgvector:pg18";

export interface DockerDbOptions {
  projectName: string;
  port?: number;
}

export interface DockerDbResult {
  connectionString: string;
  containerName: string;
  databaseName: string;
}

/**
 * Check if Docker CLI is installed
 */
async function isDockerCliInstalled(): Promise<boolean> {
  try {
    await execAsync("which docker");
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Docker daemon is running
 */
async function isDockerRunning(): Promise<boolean> {
  try {
    await execAsync("docker info");
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a macOS application is installed (registered with LaunchServices).
 * Works for apps installed anywhere, not just /Applications.
 */
async function macAppExists(appName: string): Promise<boolean> {
  try {
    await execAsync(`osascript -e 'id of app "${appName}"'`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Start Docker daemon.
 * On macOS, prefers OrbStack if installed and falls back to Docker Desktop.
 * On Linux, uses systemctl / service.
 */
async function startDocker(): Promise<void> {
  const platform = process.platform;

  if (platform === "darwin") {
    if (await macAppExists("OrbStack")) {
      console.log("   Starting OrbStack...");
      await execAsync("open -a OrbStack");
    } else if (await macAppExists("Docker")) {
      console.log("   Starting Docker Desktop...");
      await execAsync("open -a Docker");
    } else {
      throw new Error(
        "Neither OrbStack nor Docker Desktop is installed. Please install one to use local development:\n" +
          "  OrbStack (preferred): https://docs.orbstack.dev/quickstart\n" +
          "  Docker Desktop:       https://docs.docker.com/desktop/install/mac-install/",
      );
    }
  } else if (platform === "linux") {
    console.log("   Starting Docker service...");
    // Try systemctl first, fall back to service command
    try {
      await execAsync("systemctl start docker");
    } catch {
      await execAsync("service docker start");
    }
  } else {
    throw new Error(`Unsupported platform for auto-starting Docker: ${platform}`);
  }
}

/**
 * Wait for Docker daemon to be ready
 */
async function waitForDocker(maxAttempts = 120): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (await isDockerRunning()) return;
    if (attempt % 10 === 0) {
      console.log(`   Still waiting for Docker... (${attempt}s)`);
    }
    if (attempt === maxAttempts) {
      throw new Error("Docker failed to start. Please start Docker manually and try again.");
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

/**
 * Ensure Docker is available and running.
 * Throws if CLI is not installed, auto-starts daemon if not running.
 */
export async function ensureDockerReady(): Promise<void> {
  if (!(await isDockerCliInstalled())) {
    throw new Error(
      "Docker is not installed. Please install Docker to use local development:\n" +
        "  macOS:  OrbStack (preferred) https://docs.orbstack.dev/quickstart\n" +
        "          or Docker Desktop     https://docs.docker.com/desktop/install/mac-install/\n" +
        "  Linux:  https://docs.docker.com/engine/install/",
    );
  }

  if (!(await isDockerRunning())) {
    console.log("\n🐳 Docker is not running. Starting it now...\n");
    await startDocker();
    console.log("   Waiting for Docker to be ready...");
    await waitForDocker();
    console.log("   Docker is ready!\n");
  }
}

/**
 * Check if Docker is available and running
 */
export async function isDockerAvailable(): Promise<boolean> {
  if (!(await isDockerCliInstalled())) return false;
  return isDockerRunning();
}

/**
 * Check if our container is running
 */
async function isContainerRunning(containerName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`docker inspect -f '{{.State.Running}}' ${containerName}`);
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

/**
 * Check if container exists (running or stopped)
 */
async function containerExists(containerName: string): Promise<boolean> {
  try {
    await execAsync(`docker inspect ${containerName}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the port mapped for the container
 */
async function getContainerPort(containerName: string): Promise<number | null> {
  try {
    const { stdout } = await execAsync(`docker port ${containerName} 5432/tcp`);
    const match = stdout.trim().match(/:(\d+)$/);
    return match ? Number.parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

/**
 * Start the PostgreSQL container (create if needed)
 */
async function startContainer(port: number): Promise<void> {
  const exists = await containerExists(CONTAINER_NAME);

  if (exists) {
    const running = await isContainerRunning(CONTAINER_NAME);
    if (!running) {
      console.log(`   Starting existing container "${CONTAINER_NAME}"...`);
      await execAsync(`docker start ${CONTAINER_NAME}`);
    }
    return;
  }

  console.log(`   Creating PostgreSQL container "${CONTAINER_NAME}"...`);
  console.log(`   Using port ${port} (to avoid conflict with local Postgres)`);

  await execAsync(
    `docker run -d \
			--name ${CONTAINER_NAME} \
			-e POSTGRES_USER=${POSTGRES_USER} \
			-e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
			-p ${port}:5432 \
			-v ${CONTAINER_NAME}-data:/var/lib/postgresql \
			${POSTGRES_IMAGE}`,
  );
}

/**
 * Wait for PostgreSQL to be ready to accept connections
 */
async function waitForPostgres(port: number, maxAttempts = 60): Promise<void> {
  const pgReadyCmd = `docker exec ${CONTAINER_NAME} pg_isready -U ${POSTGRES_USER}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await execAsync(pgReadyCmd);
      return;
    } catch {
      if (attempt % 10 === 0) {
        console.log(`   Waiting for PostgreSQL... (${attempt}/${maxAttempts})`);
      }
      if (attempt === maxAttempts) {
        // Show container logs to help diagnose the issue
        try {
          const { stdout } = await execAsync(`docker logs ${CONTAINER_NAME} --tail 30`);
          console.error(
            `\n   Container logs:\n${stdout
              .split("\n")
              .map((l) => "   " + l)
              .join("\n")}\n`,
          );
        } catch {
          // ignore log retrieval failure
        }
        throw new Error(`PostgreSQL failed to start after ${maxAttempts} attempts`);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

/**
 * Check if a database has a `_prisma_migrations` table (i.e. is managed by
 * Prisma Migrate rather than `db push`).
 */
export async function databaseHasMigrationHistory(dbName: string): Promise<boolean> {
  assertSafeDbName(dbName);
  try {
    const { stdout } = await execAsync(
      `docker exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -d "${dbName}" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_prisma_migrations')"`,
    );
    return stdout.trim() === "t";
  } catch {
    return false;
  }
}

/**
 * Check if a database has any tables in the public schema.
 */
export async function databaseHasTables(dbName: string): Promise<boolean> {
  assertSafeDbName(dbName);
  try {
    const { stdout } = await execAsync(
      `docker exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -d "${dbName}" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"`,
    );
    return Number.parseInt(stdout.trim(), 10) > 0;
  } catch {
    return false;
  }
}

/**
 * Check if a database exists
 */
async function databaseExists(dbName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -tAc "SELECT 1 FROM pg_database WHERE datname='${dbName}'"`,
    );
    return stdout.trim() === "1";
  } catch {
    return false;
  }
}

/**
 * Check whether a Postgres is reachable at localhost:port AND has the given
 * database, by connecting directly with the `pg` driver (no Docker CLI).
 *
 * Used by {@link ensureTestDatabase} to detect a pre-provisioned Postgres
 * (e.g. a CI service container) and skip Docker container management.
 * Returns false on any connection error so the caller falls back to the
 * Docker-managed path.
 */
async function testDatabaseExists(dbName: string, port: number): Promise<boolean> {
  try {
    // Resolve `pg` from @groot/core (it's a dependency there, not at the repo
    // root). createRequire lets us resolve a CJS module path from this ESM
    // module; the dynamic import then loads it. This keeps the optional
    // pg dependency out of the SQLite engine, which never reaches this code.
    const { createRequire } = await import("node:module");
    const requireFromHere = createRequire(import.meta.url);
    const pgPath = requireFromHere.resolve("pg", {
      paths: [`${process.cwd()}/packages/core`],
    });
    const { Client } = await import(pgPath);
    const client = new Client({
      connectionString: buildConnectionString(dbName, port),
      connectionTimeoutMillis: 2000,
    });
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a database if it doesn't exist
 */
async function ensureDatabase(dbName: string): Promise<boolean> {
  const exists = await databaseExists(dbName);
  if (exists) {
    return false; // Already existed
  }

  // Wait a bit for PostgreSQL to be fully ready
  await new Promise((resolve) => setTimeout(resolve, 500));

  await execAsync(
    `docker exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -c "CREATE DATABASE \\"${dbName}\\""`,
  );
  return true; // Created new database
}

/**
 * Drop and recreate a database (for reset)
 */
async function resetDatabase(dbName: string): Promise<void> {
  // Terminate all connections to the database
  await execAsync(
    `docker exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${dbName}' AND pid <> pg_backend_pid()"`,
  ).catch(() => {
    // Ignore errors if database doesn't exist
  });

  // Drop the database
  await execAsync(
    `docker exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -c "DROP DATABASE IF EXISTS \\"${dbName}\\""`,
  );

  // Create fresh database
  await execAsync(
    `docker exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -c "CREATE DATABASE \\"${dbName}\\""`,
  );
}

/**
 * Stop the container (keeps data)
 */
async function stopContainer(): Promise<void> {
  if (await isContainerRunning(CONTAINER_NAME)) {
    await execAsync(`docker stop ${CONTAINER_NAME}`);
  }
}

/**
 * Remove the container and its data volume
 */
async function removeContainer(): Promise<void> {
  await stopContainer();
  if (await containerExists(CONTAINER_NAME)) {
    await execAsync(`docker rm ${CONTAINER_NAME}`);
  }
  // Also remove the data volume
  await execAsync(`docker volume rm ${CONTAINER_NAME}-data`).catch(() => {
    // Volume may not exist
  });
}

/**
 * Shared logic: ensure the Docker Postgres container is running with the given database.
 */
async function ensureContainerWithDatabase(
  dbName: string,
  port: number,
  label: string,
): Promise<DockerDbResult> {
  // Ensure Docker is installed and running
  await ensureDockerReady();

  // Start container if needed
  await startContainer(port);

  // Wait for PostgreSQL to be ready
  await waitForPostgres(port);

  // Create database if needed
  const created = await ensureDatabase(dbName);
  if (created) {
    console.log(`   Created ${label} database "${dbName}"`);
  }

  const connectionString = buildConnectionString(dbName, port);

  return {
    connectionString,
    containerName: CONTAINER_NAME,
    databaseName: dbName,
  };
}

/**
 * Main entry point: Ensure a PostgreSQL container is running with a database for the project
 */
export async function ensurePostgresContainer(options: DockerDbOptions): Promise<DockerDbResult> {
  const { projectName, port = DEFAULT_PORT } = options;
  const dbName = sanitizeDbName(projectName);
  return ensureContainerWithDatabase(dbName, port, "");
}

/**
 * Ensure the test database (`${projectName}_test`) exists in the same container.
 * Uses the same Docker container as the dev DB — fully isolated at the database level.
 */
export async function ensureTestDatabase(options: DockerDbOptions): Promise<DockerDbResult> {
  const { projectName, port = DEFAULT_PORT } = options;
  const dbName = `${sanitizeDbName(projectName)}_test`;

  // CI / pre-provisioned Postgres fast path: if a Postgres is already
  // reachable at the configured port AND the test database already exists,
  // skip all Docker container management. This lets the test suite run against
  // a GitHub Actions `postgres` service container (or any external Postgres)
  // without the Docker CLI. We still verify the DB exists so a misconfigured
  // URL fails loudly instead of silently creating a stray container.
  if (await testDatabaseExists(dbName, port)) {
    return {
      connectionString: buildConnectionString(dbName, port),
      containerName: "(external)",
      databaseName: dbName,
    };
  }

  return ensureContainerWithDatabase(dbName, port, "test");
}

/**
 * Build PostgreSQL connection string
 */
function buildConnectionString(dbName: string, port: number): string {
  return `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${port}/${dbName}`;
}

/**
 * Reject database names that aren't safe to interpolate into a shell `psql`
 * command. `sanitizeDbName` already restricts names to [a-z0-9_], but these
 * helpers are exported, so a caller passing anything else would reach the
 * shell — assert at the boundary rather than trust every caller.
 */
function assertSafeDbName(dbName: string): void {
  if (!/^[a-z0-9_]+$/.test(dbName)) {
    throw new Error(`Unsafe database name "${dbName}" — expected only [a-z0-9_].`);
  }
}

/**
 * Sanitize project name for use as database name
 * (replace non-alphanumeric chars with underscores)
 */
function sanitizeDbName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
}

// Export cleanup functions for the CLI
export const dockerDb = {
  stop: stopContainer,
  remove: removeContainer,
  reset: resetDatabase,
  isRunning: () => isContainerRunning(CONTAINER_NAME),
  exists: () => containerExists(CONTAINER_NAME),
  getPort: () => getContainerPort(CONTAINER_NAME),
};
