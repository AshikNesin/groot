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
 * Start Docker daemon (Docker Desktop on macOS, systemctl on Linux)
 */
async function startDocker(): Promise<void> {
  const platform = process.platform;

  if (platform === "darwin") {
    console.log("   Starting Docker Desktop...");
    await execAsync("open -a Docker");
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
        "  macOS:  https://docs.docker.com/desktop/install/mac-install/\n" +
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
			-v ${CONTAINER_NAME}-data:/var/lib/postgresql/data \
			${POSTGRES_IMAGE}`,
  );
}

/**
 * Wait for PostgreSQL to be ready to accept connections
 */
async function waitForPostgres(port: number, maxAttempts = 30): Promise<void> {
  const pgReadyCmd = `docker exec ${CONTAINER_NAME} pg_isready -U ${POSTGRES_USER}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await execAsync(pgReadyCmd);
      return;
    } catch {
      if (attempt === maxAttempts) {
        throw new Error(`PostgreSQL failed to start after ${maxAttempts} attempts`);
      }
      // Wait 500ms before next attempt
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
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
 * Main entry point: Ensure a PostgreSQL container is running with a database for the project
 */
export async function ensurePostgresContainer(options: DockerDbOptions): Promise<DockerDbResult> {
  const { projectName, port = DEFAULT_PORT } = options;
  const dbName = sanitizeDbName(projectName);

  // Ensure Docker is installed and running
  await ensureDockerReady();

  // Start container if needed
  await startContainer(port);

  // Wait for PostgreSQL to be ready
  await waitForPostgres(port);

  // Create database if needed
  const created = await ensureDatabase(dbName);
  if (created) {
    console.log(`   Created database "${dbName}"`);
  }

  const connectionString = buildConnectionString(dbName, port);

  return {
    connectionString,
    containerName: CONTAINER_NAME,
    databaseName: dbName,
  };
}

/**
 * Build PostgreSQL connection string
 */
function buildConnectionString(dbName: string, port: number): string {
  return `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${port}/${dbName}`;
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
