/**
 * Docker PostgreSQL Manager for Local Development
 *
 * Provides multi-connection PostgreSQL support via Docker, avoiding the
 * single-connection limitation of PGlite.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const CONTAINER_NAME = "local-dev-postgres";
const POSTGRES_USER = "postgres";
const POSTGRES_PASSWORD = "postgres";
const DEFAULT_PORT = 5433;
const POSTGRES_IMAGE = "postgres:18-alpine";

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
 * Check if Docker is available and running
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await execAsync("docker info");
    return true;
  } catch {
    return false;
  }
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
