#!/usr/bin/env node
const pkg = require("../package.json");
const dbName = (pkg.name || "app").replace(/[^a-zA-Z0-9_]/g, "_");
const port = process.env.LOCAL_DB_DOCKER_PORT || 5433;
console.log(`postgresql://postgres:postgres@localhost:${port}/${dbName}`);
