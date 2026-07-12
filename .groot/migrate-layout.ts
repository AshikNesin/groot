#!/usr/bin/env tsx
/**
 * One-time layout migration for downstream repos.
 *
 * Moves files from the pre-2.0 flat layout (client/src, server/src) to the
 * workspace layout (apps/web/src, packages/*). Run once after syncing groot v2+.
 *
 *   tsx .groot/migrate-layout.ts           # apply
 *   tsx .groot/migrate-layout.ts --check   # dry run
 *
 * Steps:
 *   1. git mv synced + app-owned files to new paths (preserves local edits)
 *   2. Rewrite @/ imports to @groot/* package imports
 *   3. Update prisma schema.prisma generator output path
 *   4. Rebase the sync baseline tree through the layout map
 *
 * After running: `pnpm install` then `pnpm prisma generate`.
 */
import { execSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const CWD = process.cwd();
const dryRun = process.argv.includes("--check");

function git(args: string[]): void {
  const cmd = `git ${args.join(" ")}`;
  if (dryRun) {
    console.log(`  [dry-run] ${cmd}`);
    return;
  }
  execSync(cmd, { stdio: "pipe", cwd: CWD });
}

/**
 * Run `git update-index --index-info` with stdin piped from input.
 * Uses spawnSync with error checking so a failed update-index never silently
 * produces an empty tree.
 */
function gitUpdateIndex(indexInput: string, env: NodeJS.ProcessEnv): void {
  const result = spawnSync("git", ["update-index", "--index-info"], {
    input: indexInput,
    env,
    cwd: CWD,
    encoding: "utf-8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `git update-index --index-info failed (exit ${result.status}): ${result.stderr}`,
    );
  }
}

/**
 * Check if a tracked file has uncommitted modifications.
 */
function isDirty(filePath: string): boolean {
  try {
    const status = execSync(`git status --porcelain -- ${JSON.stringify(filePath)}`, {
      encoding: "utf-8",
      cwd: CWD,
    }).trim();
    return status.length > 0;
  } catch {
    return false;
  }
}

/**
 * Move a directory via `git mv`, merging contents if the destination already
 * exists (e.g. when the first sync already created packages/ui/src).
 *
 * File collisions are resolved safely:
 * - If the source file is clean (no local edits), remove it in favor of the
 *   synced destination.
 * - If the source file has local modifications, abort the migration rather
 *   than risk losing uncommitted work.
 */
function gitMv(oldPath: string, newPath: string): void {
  if (!existsSync(join(CWD, oldPath))) return;
  const destExists = existsSync(join(CWD, newPath));
  if (destExists) {
    // Destination already exists (sync already created it) — move contents
    // individually, merging into the existing directory.
    const entries = readdirSync(join(CWD, oldPath));
    for (const entry of entries) {
      const srcFile = `${oldPath}/${entry}`;
      const destFile = `${newPath}/${entry}`;
      if (existsSync(join(CWD, destFile))) {
        // Collision: both source and destination exist.
        if (isDirty(srcFile)) {
          throw new Error(
            `File collision with uncommitted local edits: ${srcFile} has modifications` +
              ` but ${destFile} already exists (synced). Commit or stash changes` +
              ` before running migration.`,
          );
        }
        // Source is clean — safe to remove in favor of the synced version.
        git(["rm", "-f", srcFile]);
        console.log(`  resolve: ${srcFile} (kept synced ${destFile})`);
      } else {
        git(["mv", srcFile, destFile]);
        console.log(`  mv: ${srcFile} -> ${destFile}`);
      }
    }
    console.log(`  merge: ${oldPath}/* -> ${newPath}/`);
  } else {
    if (!dryRun) mkdirSync(join(CWD, dirname(newPath)), { recursive: true });
    git(["mv", oldPath, newPath]);
    console.log(`  mv: ${oldPath} -> ${newPath}`);
  }
}

function plainMove(oldPath: string, newPath: string): void {
  const oldFull = join(CWD, oldPath);
  const newFull = join(CWD, newPath);
  if (!existsSync(oldFull)) return;
  if (dryRun) {
    console.log(`  [dry-run] mv ${oldPath} -> ${newPath}`);
    return;
  }
  mkdirSync(join(CWD, dirname(newPath)), { recursive: true });
  renameSync(oldFull, newFull);
  console.log(`  mv: ${oldPath} -> ${newPath}`);
}

console.log("\n## Groot Layout Migration v1\n");
console.log(`Mode: ${dryRun ? "dry run" : "apply"}\n`);

// --- Step 1: Move files ---
console.log("### Step 1: Move files\n");

// packages/ui
gitMv("client/src/ui", "packages/ui/src");

// packages/shell
plainMove("client/src/index.css", "packages/shell/src/index.css");
gitMv("client/src/core", "packages/shell/src");

// packages/core
gitMv("server/src/core", "packages/core/src");
gitMv("server/src/shared", "packages/core/src");

// packages/core (generated dir is gitignored, just remove old reference)
// The schema.prisma output path is updated in step 3.

// apps/web
gitMv("client/index.html", "apps/web/index.html");
gitMv("client/tsconfig.json", "apps/web/tsconfig.json");
gitMv("client/src/App.tsx", "apps/web/src/client/App.tsx");
gitMv("client/src/main.tsx", "apps/web/src/client/main.tsx");
gitMv("client/src/app", "apps/web/src/client/pages");
plainMove("client/src/test", "apps/web/src/client/test");
gitMv("server/src/index.ts", "apps/web/src/server/index.ts");
gitMv("server/src/routes.ts", "apps/web/src/server/routes.ts");
gitMv("server/src/app", "apps/web/src/server/api");

// Remove old generated dir (regenerated by prisma generate at new path)
if (existsSync(join(CWD, "server/src/generated"))) {
  if (!dryRun) rmSync(join(CWD, "server/src/generated"), { recursive: true, force: true });
  console.log("  rm: server/src/generated (will regenerate)");
}

// --- Step 2: Rewrite imports ---
console.log("\n### Step 2: Rewrite imports\n");
console.log("  (Import rewriting is handled by the sync engine's 3-way merge.)");
console.log("  After migration, run 'pnpm groot:sync' to get the new import paths.");

// --- Step 3: Move prisma/ and update schema output ---
console.log("\n### Step 3: Move prisma/ and update schema\n");
gitMv("prisma", "apps/web/prisma");
const schemaPath = join(CWD, "apps/web/prisma/schema.prisma");
if (existsSync(schemaPath)) {
  const schema = readFileSync(schemaPath, "utf-8");
  const updated = schema.replace(
    /output\s+=\s+"\.\.\/server\/src\/generated\/prisma"/,
    'output = "../../../packages/core/generated/prisma"',
  );
  if (updated !== schema) {
    if (!dryRun) writeFileSync(schemaPath, updated);
    console.log("  Updated prisma schema.prisma generator output path.");
  } else {
    console.log("  prisma schema.prisma already updated (or not found pattern).");
  }
}

// --- Step 4: Clean up empty dirs ---
console.log("\n### Step 4: Clean up\n");
if (!dryRun) {
  for (const dir of ["client/src", "client", "server/src", "server"]) {
    const full = join(CWD, dir);
    if (existsSync(full)) {
      try {
        rmdirSync(full);
        console.log(`  cleaned: ${dir}/`);
      } catch {
        // not empty, leave it
      }
    }
  }
}

// --- Step 5: Rebase sync baseline tree ---
// The baseline ref (refs/groot/baseline) still has files at old paths.
// Rewrite each old path to its new location so the first post-migration
// sync produces clean three-way merges instead of missing-base conflicts.
console.log("\n### Step 5: Rebase sync baseline\n");

// Separate the existence check from the rebase work so errors in the rebase
// are not masked as "no baseline ref found."
let baselineExists = false;
try {
  execSync("git rev-parse --verify refs/groot/baseline", { stdio: "pipe", cwd: CWD });
  baselineExists = true;
} catch {
  baselineExists = false;
}

if (!baselineExists) {
  console.log("  No baseline ref found — skipping (first sync will create it).");
} else {
  try {
    const pathMap: Record<string, string> = {
      "client/src/ui": "packages/ui/src",
      "client/src/core": "packages/shell/src",
      "client/src/index.css": "packages/shell/src/index.css",
      "client/src/App.tsx": "apps/web/src/client/App.tsx",
      "client/src/main.tsx": "apps/web/src/client/main.tsx",
      "client/src/app": "apps/web/src/client/pages",
      "client/index.html": "apps/web/index.html",
      "client/tsconfig.json": "apps/web/tsconfig.json",
      "server/src/core": "packages/core/src",
      "server/src/shared": "packages/core/src",
      "server/src/index.ts": "apps/web/src/server/index.ts",
      "server/src/routes.ts": "apps/web/src/server/routes.ts",
      "server/src/app": "apps/web/src/server/api",
      prisma: "apps/web/prisma",
    };

    // Build a new index from the baseline tree, rewriting paths.
    const scratchDir = join(CWD, ".git/groot-migrate-scratch");
    if (!dryRun) mkdirSync(scratchDir, { recursive: true });

    const env = { ...process.env, GIT_INDEX_FILE: join(scratchDir, "index") };
    if (!dryRun) execSync("git read-tree --empty", { env, cwd: CWD });

    // Read all blobs from baseline and re-index at new paths.
    const treeOutput = execSync(
      `git ls-tree -r --format='%(objectmode) %(objectname) %(path)' refs/groot/baseline`,
      { encoding: "utf-8", cwd: CWD },
    ).trim();

    if (treeOutput) {
      const indexLines: string[] = [];
      for (const line of treeOutput.split("\n")) {
        const match = line.match(/^(\S+) (\S+) (.+)$/);
        if (!match) continue;
        const [, mode, sha, path] = match;

        let newPath = path;
        for (const [oldPrefix, newPrefix] of Object.entries(pathMap)) {
          if (path === oldPrefix || path.startsWith(oldPrefix + "/")) {
            newPath = newPrefix + path.slice(oldPrefix.length);
            break;
          }
        }
        indexLines.push(`${mode} ${sha}\t${newPath}`);
      }

      if (!dryRun && indexLines.length > 0) {
        // Write index entries and create a new tree + commit.
        const indexInput = indexLines.join("\n") + "\n";
        gitUpdateIndex(indexInput, env);

        const tree = execSync("git write-tree", { env, cwd: CWD, encoding: "utf-8" }).trim();

        // Sanity check: reject the well-known empty tree hash.
        const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
        if (tree === EMPTY_TREE) {
          throw new Error(
            "Baseline rebase produced an empty tree — aborting to prevent data loss.",
          );
        }

        // Read the original commit message (preserves metadata).
        const origMessage = execSync("git log -1 --format=%B refs/groot/baseline", {
          encoding: "utf-8",
          cwd: CWD,
        });

        const newCommit = execSync(
          `git -c user.name=groot-sync -c user.email=groot-sync@localhost commit-tree ${tree} -m "${origMessage.replace(/"/g, '\\"').replace(/\n/g, '" -m "')}"`,
          { encoding: "utf-8", cwd: CWD },
        ).trim();

        execSync(`git update-ref refs/groot/baseline ${newCommit}`, { cwd: CWD });
      }
      console.log(`  Rebased ${indexLines.length} baseline entries.`);
    } else {
      console.log("  Baseline tree is empty, nothing to rebase.");
    }

    if (!dryRun) rmSync(scratchDir, { recursive: true, force: true });
  } catch (err) {
    console.error(`  Error rebasing baseline: ${err instanceof Error ? err.message : String(err)}`);
    console.error("  Deleting stale baseline ref so the next groot:sync rebuilds");
    console.error("  it cleanly from the boilerplate clone.");
    if (!dryRun) {
      try {
        execSync("git update-ref -d refs/groot/baseline", { stdio: "pipe", cwd: CWD });
      } catch {
        // ref may already be gone
      }
    }
  }
}

console.log("\n### Next steps:");
console.log("  1. Run 'pnpm install' to set up workspace links");
console.log("  2. Run 'pnpm prisma generate' to generate the Prisma client at the new path");
console.log("  3. Run 'pnpm groot:sync' to get updated imports from the boilerplate");
console.log("  4. Run 'pnpm check && pnpm test' to verify\n");
