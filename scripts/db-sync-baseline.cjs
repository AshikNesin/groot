#!/usr/bin/env node
/**
 * Bring a drifted (db-push-managed) database into the Prisma migrate workflow.
 *
 * Most projects start with `prisma db push` (fast iteration) and only switch to
 * `migrate` later — often after the first production incident. At that moment the
 * database has no `_prisma_migrations` table (or one whose rows don't match the
 * migrations folder) and its actual schema is an unknown drift away from
 * schema.prisma. This script brings any such database into the migrate workflow,
 * idempotently and safely.
 *
 * Usage:
 *   pnpm db:baseline                  # uses the configured datasource
 *   pnpm db:baseline -- --dry-run     # generate SQL, don't apply
 *
 * Safe by default:
 *   - Only applies ADDITIVE SQL (CREATE / ALTER TABLE ... ADD COLUMN / ADD
 *     CONSTRAINT / CREATE INDEX / CREATE TYPE). Any DROP / RENAME / ALTER COLUMN
 *     or TRUNCATE causes the script to write the SQL for review and exit without
 *     applying.
 *   - Always writes the generated SQL to tmp/db-baseline-sync.sql and prints its
 *     path before applying, so the operator can inspect it.
 *   - Idempotent: re-running on an already-synced, baselined database is a no-op
 *     (exit 0).
 *
 * Pooled databases: the datasource URL is read from prisma.config.ts, which
 * routes the migrate engine at DATABASE_URL_DIRECT (bypassing transaction-mode
 * poolers like Supabase Supavisor / PgBouncer) when set — so this works against
 * pooled databases too. Run via `pnpm db:baseline` so varlock loads the env.
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const DRY_RUN = process.argv.includes("--dry-run");
const OUT_SQL = path.join(process.cwd(), "tmp", "db-baseline-sync.sql");
const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

/** The baseline is the earliest migration folder, sorted by timestamp prefix. */
function detectBaselineMigration() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return null;
  const dirs = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(
      (d) =>
        /^\d+/.test(d) &&
        fs.existsSync(path.join(MIGRATIONS_DIR, d)) &&
        fs.statSync(path.join(MIGRATIONS_DIR, d)).isDirectory(),
    )
    .sort();
  return dirs[0] ?? null;
}

/** Run a command, returning { status, stdout, stderr }. Inherits env. */
function run(cmd, opts = {}) {
  return spawnSync(cmd, { shell: true, encoding: "utf-8", maxBuffer: 1024 * 1024 * 64, ...opts });
}

/** Run a command and return trimmed stdout; throw on non-zero exit. */
function runText(cmd) {
  const res = run(cmd);
  if (res.status !== 0) {
    const err = new Error(`${cmd} failed (exit ${res.status})`);
    err.stderr = (res.stderr || "").trim();
    err.stdout = (res.stdout || "").trim();
    throw err;
  }
  return (res.stdout || "").trim();
}

/**
 * A diff is safe (additive) if it contains no data-destroying statements.
 * Prisma's `--script` output emits each statement on its own line, so a per-line
 * scan is sufficient and catches both standalone `DROP ...` and
 * `ALTER TABLE ... DROP/RENAME/ALTER COLUMN`.
 */
function findDestructiveStatements(sql) {
  const dangerous = [];
  for (const raw of sql.split("\n")) {
    const stmt = raw.trim();
    if (!stmt || stmt.startsWith("--") || stmt.startsWith("/*") || stmt.startsWith("*")) continue;
    if (
      /^(DROP\s+(TABLE|INDEX|COLUMN|CONSTRAINT|TYPE|SCHEMA|DATABASE))\b/i.test(stmt) ||
      /^ALTER\s+TABLE\b.*\b(DROP|RENAME|ALTER\s+COLUMN)\b/i.test(stmt) ||
      /^TRUNCATE\b/i.test(stmt)
    ) {
      dangerous.push(stmt);
    }
  }
  return dangerous;
}

function main() {
  const baseline = detectBaselineMigration();
  if (!baseline) {
    console.error("✖ No migrations found under prisma/migrations/. Create the baseline first:");
    console.error("    pnpm db:migrate:create --name baseline_models");
    process.exit(1);
  }

  console.log("→ Generating diff SQL (live DB → schema.prisma)...");
  const sql = runText(
    "pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script",
  );

  fs.mkdirSync(path.dirname(OUT_SQL), { recursive: true });
  fs.writeFileSync(OUT_SQL, sql + "\n");
  const lineCount = sql ? sql.split("\n").length : 0;
  console.log(`→ SQL written to ${OUT_SQL} (${lineCount} lines)`);

  // Prisma emits "-- This is an empty migration." (a comment) when the DB already
  // matches the schema. Treat comment-only output as nothing to apply.
  const hasExecutableSql = sql.split("\n").some((l) => {
    const s = l.trim();
    return s && !s.startsWith("--") && !s.startsWith("/*") && !s.startsWith("*");
  });

  if (!hasExecutableSql) {
    console.log("✓ Database schema already matches schema.prisma — nothing to apply.");
  } else {
    const destructive = findDestructiveStatements(sql);
    if (destructive.length > 0) {
      console.error("");
      console.error("✖ Diff contains non-additive statements. Refusing to apply automatically:");
      for (const s of destructive) console.error("    " + s);
      console.error("");
      console.error(`  Review ${OUT_SQL} and apply manually if it is safe.`);
      process.exit(1);
    }

    if (DRY_RUN) {
      console.log("→ --dry-run: SQL generated, not applying.");
      console.log("✓ Done (dry run).");
      return;
    }

    console.log("→ Applying additive SQL to target database...");
    // Prisma 7 reads the datasource URL from prisma.config.ts (no --schema).
    const apply = run("pnpm exec prisma db execute --stdin", {
      input: sql,
    });
    process.stdout.write(apply.stdout || "");
    process.stderr.write(apply.stderr || "");
    if (apply.status !== 0) {
      console.error("✖ prisma db execute exited with code " + apply.status);
      console.error(`  The generated SQL is still available at ${OUT_SQL}.`);
      process.exit(apply.status ?? 1);
    }
  }

  if (DRY_RUN) {
    console.log("→ --dry-run: not marking baseline as applied.");
    console.log("✓ Done (dry run).");
    return;
  }

  // Mark the baseline migration as applied so future `migrate deploy` works.
  // Idempotent: Prisma reports (and may exit non-zero for) an already-applied
  // migration — both cases are treated as success here.
  console.log(`→ Marking baseline '${baseline}' as applied...`);
  const resolve = run(`pnpm exec prisma migrate resolve --applied ${baseline}`);
  const resolveOut = ((resolve.stdout || "") + "\n" + (resolve.stderr || "")).trim();
  const alreadyApplied = /already/i.test(resolveOut);
  if (resolve.status === 0 || alreadyApplied) {
    console.log(
      alreadyApplied
        ? `✓ Baseline '${baseline}' already marked as applied.`
        : `✓ Baseline '${baseline}' marked as applied.`,
    );
  } else {
    process.stdout.write(resolve.stdout || "");
    process.stderr.write(resolve.stderr || "");
    console.error("✖ prisma migrate resolve exited with code " + resolve.status);
    process.exit(resolve.status ?? 1);
  }

  console.log("→ Verifying migration status...");
  const status = run("pnpm exec prisma migrate status");
  process.stdout.write(status.stdout || "");
  if (status.stderr) process.stderr.write(status.stderr);

  console.log("");
  console.log("✓ Database baselined. Future deploys: pnpm db:migrate");
}

try {
  main();
} catch (e) {
  console.error("✖ Baseline failed.");
  if (e.stderr) console.error(e.stderr);
  console.error(e.message);
  process.exit(1);
}
