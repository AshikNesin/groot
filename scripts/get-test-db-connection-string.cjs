#!/usr/bin/env node
/**
 * Outputs the test database connection string.
 *
 * The test DB lives in the SAME Docker container as the dev DB
 * (groot-local-dev-db, port 5433) but as a separate database
 * named `${dbName}_test`, so tests can never touch dev data.
 *
 * This derives the URL from get-local-db-connection-string.cjs
 * (which knows the credentials) and appends `_test` to the db name.
 */
const { execSync } = require("child_process");
const devUrl = execSync("node scripts/get-local-db-connection-string.cjs", {
  cwd: process.cwd(),
  env: process.env,
})
  .toString()
  .trim();
// Append _test to the database name (last path segment of the URL)
const testUrl = devUrl.replace(/\/([^/]+)$/, "/$1_test");
console.log(testUrl);
