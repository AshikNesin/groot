#!/usr/bin/env node
/**
 * Varlock wrapper that handles conflicting system env vars.
 * - Unsets empty AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
 * - Always unsets NODE_ENV (let varlock decide)
 */

import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const separatorIndex = args.indexOf("--");
if (separatorIndex === -1 || separatorIndex === args.length - 1) {
  console.error("Usage: varlock -- <command>");
  process.exit(1);
}

const command = args.slice(separatorIndex + 1);

// Unset empty AWS vars
if (!process.env.AWS_ACCESS_KEY_ID) delete process.env.AWS_ACCESS_KEY_ID;
if (!process.env.AWS_SECRET_ACCESS_KEY) delete process.env.AWS_SECRET_ACCESS_KEY;

// Always unset NODE_ENV - let varlock decide
delete process.env.NODE_ENV;

// Run command through varlock
const result = spawnSync("varlock", ["run", "--", ...command], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

if (result.error) {
  console.error("Failed to run varlock:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
