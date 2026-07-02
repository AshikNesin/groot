#!/usr/bin/env tsx
/**
 * Groot Sync v4 - Deterministic, version-aware boilerplate sync tool
 *
 * Performs a real three-way merge for every locally-modified synced file so
 * non-overlapping upstream changes apply automatically instead of piling up in
 * a manual review list. Files that still genuinely conflict are written with
 * conflict markers and recorded in `.groot/needs-review/manifest.json` for the
 * AI-assisted resolver (`pnpm groot:resolve`, powered by the Cline SDK / GLM Coding Plan).
 *
 * Usage:
 *   pnpm groot:check            - Check for available changes (dry run)
 *   pnpm groot:sync             - Apply safe changes + write conflict markers
 *   pnpm groot:sync --skip-conflicts
 *                               - Apply only clean changes (CI), record
 *                                 conflicts in the manifest without writing
 *                                 markers into the working tree
 */
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, normalize } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import micromatch from "micromatch";
import { acquireBoilerplate, releaseBoilerplate } from "./_acquire";
import { mergePackageJson, PACKAGE_JSON_FILENAME } from "./package-json-merge";

const exec = promisify(execFile);

// ============================================================
// ZOD SCHEMAS - Single source of truth with runtime validation
// ============================================================

const SyncConfigSchema = z.object({
  boilerplate: z.object({
    name: z.string().min(1, "Boilerplate name is required"),
    repo: z.string().url("Invalid repository URL"),
  }),
  last_sync: z.object({
    version: z.string().optional().describe("Semver version tag of last sync (e.g. '1.3.0')"),
    commit: z.string().regex(/^[a-f0-9]{7,40}$/, "Invalid commit SHA"),
    date: z.string(),
  }),
  additional_exclusions: z
    .array(z.string())
    .default([])
    .describe(
      "Project-specific patterns to exclude from sync (e.g., custom components, experimental features)",
    ),
});

type _SyncConfig = z.infer<typeof SyncConfigSchema>;

// ============================================================
// IMMUTABLE EXCLUSIONS - Cannot be overridden by config
// Security-critical files that must NEVER be synced
// ============================================================

const IMMUTABLE_EXCLUSIONS: readonly string[] = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.*.local",
  "prisma/schema.prisma",
  "prisma/migrations/**",
  "node_modules/**",
  "dist/**",
  ".git/**",
  "*.pem",
  "*.key",
  "secrets/**",

  // Sync tooling state — must NEVER be overwritten with the boilerplate's
  // own values (would corrupt this project's last_sync baseline).
  // Project-only docs live here too and must not be clobbered by the
  // boilerplate's copies.
  ".groot/boilerplate-sync.json",
  ".groot/sync-report.json",
  ".groot/feature-request.md",
  ".groot/repo-drift.md",

  // Conflict-resolution working state (manifest + any scratch files). This is
  // generated per-project and must never be pulled from the boilerplate.
  ".groot/needs-review/**",
] as const;

// ============================================================
// SYNC PATTERNS - Files that should be synced
// ============================================================

const SYNC_PATTERNS: readonly string[] = [
  // UI Components (design system primitives). See AGENTS.md "Frontend Layering".
  "client/src/ui/**",
  "client/src/index.css",

  // Client Core (boilerplate infrastructure: layouts, api client, stores,
  // hooks, lib, types, services). Mirrors server/src/core on the client.
  "client/src/core/**",

  // Server Core (drop-in infrastructure)
  "server/src/core/**",
  "server/src/test-helpers.ts",

  // Server Shared (reusable features: auth, storage, etc.)
  "server/src/shared/**",

  // Tests mirroring synced source (core/shared infra + ui primitives +
  // shared test setup). App-specific and e2e tests stay project-local.
  "tests/server/core/**",
  "tests/server/shared/**",
  "tests/server/setup.ts",
  "tests/client/setup.ts",
  "tests/client/components/ui/**",

  // Infrastructure
  "*.config.*",
  "tsconfig.json",
  ".github/workflows/**",
  ".vite-hooks/**",
  ".gitleaks.toml",
  "scripts/**",

  // Sync tooling — keep the sync tool itself up to date.
  // State files (boilerplate-sync.json, sync-report.json) and project-only
  // docs (feature-request.md, repo-drift.md) are guarded by
  // IMMUTABLE_EXCLUSIONS so only the tool's _code_ syncs.
  ".groot/**",

  // Agent skills shipped with the boilerplate (groot-sync, node, grill-me,
  // improve-codebase-architecture). Child repos can opt out of specific
  // skills via additional_exclusions if they keep their own.
  ".agents/skills/**",

  // Documentation
  "docs/**",

  // Environment template (not actual secrets)
  ".env.schema",
] as const;

// ============================================================
// SKIP PATTERNS - App-specific code to never sync
// ============================================================

const SKIP_PATTERNS: readonly string[] = [
  // App-specific server code (never sync)
  "server/src/app/**",
  "server/src/routes.ts",
  "server/src/index.ts",

  // App-specific client code (never sync). The frontend app/ layer holds
  // project features; ui/ and core/ are synced (see SYNC_PATTERNS).
  "client/src/app/**",

  // Project-local tests (app routes, end-to-end). Core/shared/ui tests are
  // synced; these stay project-specific.
  "tests/server/app/**",
  "tests/server/routes/**",
  "tests/e2e/**",

  // Other (project-owned docs and lockfile)
  "README.md",
  "pnpm-lock.yaml",
] as const;

// Files that don't match a sync pattern by glob but should still flow through
// the three-way merge path (their content genuinely belongs to both repos).
const FORCE_MERGE_FILES: readonly string[] = [".gitignore", "package.json"] as const;

// ============================================================
// PATH VALIDATION - Security against traversal attacks
// ============================================================

const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /\.\./, // Path traversal
  /~/, // Home directory
  /\\0/, // Null byte (escaped for lint)
  /^\//, // Absolute path
  /\$\(/, // Command substitution
  /`/, // Backtick
] as const;

function validateFilePath(filePath: string): { valid: boolean; reason?: string } {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(filePath)) {
      return { valid: false, reason: "Forbidden pattern detected" };
    }
  }

  const normalized = normalize(filePath);
  if (normalized.startsWith("..") || normalized.startsWith("/")) {
    return { valid: false, reason: "Path traversal attempt" };
  }

  return { valid: true };
}

// ============================================================
// CATEGORIZATION - Where does a changed file belong?
// ============================================================

type Action = "sync" | "skip-immutable" | "skip-app" | "drift";

function categorizeFile(filePath: string, additionalExclusions: string[]): { action: Action } {
  // 1. Immutable exclusions first (security)
  if (micromatch.isMatch(filePath, IMMUTABLE_EXCLUSIONS as string[])) {
    return { action: "skip-immutable" };
  }

  // 2. App-specific skip patterns (incl. project-local exclusions)
  const allSkipPatterns = [...SKIP_PATTERNS, ...additionalExclusions];
  if (micromatch.isMatch(filePath, allSkipPatterns)) {
    return { action: "skip-app" };
  }

  // 3. Files that always merge (content shared by both repos)
  if (FORCE_MERGE_FILES.includes(filePath)) {
    return { action: "sync" };
  }

  // 4. Sync patterns
  if (micromatch.isMatch(filePath, SYNC_PATTERNS as string[])) {
    return { action: "sync" };
  }

  // 5. Changed in groot, matches no sync pattern → drift (new boilerplate
  //    surface the project may want to adopt manually).
  return { action: "drift" };
}

// ============================================================
// THREE-WAY MERGE - The heart of the sync
// ============================================================

type MergeOutcome =
  | { kind: "auto-apply"; content: string }
  | { kind: "identical" }
  | { kind: "auto-merged"; content: string }
  | { kind: "conflict"; content: string; conflicts: number };

/**
 * Run `git merge-file` over three temp files and capture the merged result.
 * Exit code 0 → clean merge; >0 → that many conflict hunks (markers in stdout).
 */
async function gitMergeFile(
  file: string,
  ours: string,
  base: string,
  theirs: string,
): Promise<{ clean: boolean; content: string; conflicts: number }> {
  const dir = await mkdtemp(join(tmpdir(), "groot-merge-"));
  try {
    const oursPath = join(dir, "ours");
    const basePath = join(dir, "base");
    const theirsPath = join(dir, "theirs");
    await writeFile(oursPath, ours);
    await writeFile(basePath, base);
    await writeFile(theirsPath, theirs);

    try {
      const { stdout } = await exec("git", [
        "merge-file",
        "-p",
        "--diff3",
        "-L",
        `${file} (current_repo)`,
        "-L",
        `${file} (last_sync)`,
        "-L",
        `${file} (groot_boilerplate)`,
        oursPath,
        basePath,
        theirsPath,
      ]);
      return { clean: true, content: stdout, conflicts: 0 };
    } catch (err) {
      const e = err as { code?: number; stdout?: string };
      if (typeof e.code === "number" && e.code > 0 && typeof e.stdout === "string") {
        return { clean: false, content: e.stdout, conflicts: e.code };
      }
      throw err;
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Build a two-way conflict block when there is no common ancestor to merge. */
export function twoWayConflictMarkers(file: string, ours: string, theirs: string): string {
  return [
    `<<<<<<< ${file} (current_repo)`,
    ours.replace(/\n$/, ""),
    "=======",
    theirs.replace(/\n$/, ""),
    `>>>>>>> ${file} (groot_boilerplate)`,
    "",
  ].join("\n");
}

/**
 * Decide what to do with a single synced file by comparing three versions:
 *   base   = content at the last synced commit
 *   ours   = current local content
 *   theirs = new boilerplate content
 */
async function threeWayMerge(
  file: string,
  tempDir: string,
  projectRoot: string,
  lastSyncCommit: string,
): Promise<MergeOutcome> {
  const theirs = await readFile(join(tempDir, file), "utf-8");

  let ours: string | null = null;
  try {
    ours = await readFile(join(projectRoot, file), "utf-8");
  } catch {
    ours = null;
  }

  let base: string | null = null;
  try {
    const { stdout } = await exec("git", ["show", `${lastSyncCommit}:${file}`], { cwd: tempDir });
    base = stdout;
  } catch {
    base = null;
  }

  // New file locally absent → just add it.
  if (ours === null) return { kind: "auto-apply", content: theirs };

  // Already in sync.
  if (ours === theirs) return { kind: "identical" };

  // package.json: merge deterministically instead of via `git merge-file` so
  // non-managed keys (`name`, `version`, `description`, `packageManager`, …)
  // never raise conflict markers. Only `scripts`/`dependencies`/`devDependencies`
  // flow boilerplate → child; every other key is copied verbatim from ours.
  // When the merge result equals ours (only non-managed keys differed) this is a
  // no-op; otherwise the merged content is written cleanly as `auto-merged`. The
  // marker-based path below is the fallback when JSON is unparseable.
  if (file === PACKAGE_JSON_FILENAME && base !== null) {
    const merged = mergePackageJson(ours, base, theirs);
    if (merged.ok) {
      return merged.text === ours
        ? { kind: "identical" }
        : { kind: "auto-merged", content: merged.text };
    }
  }

  // Untouched locally since last sync → take theirs.
  if (base !== null && ours === base) return { kind: "auto-apply", content: theirs };

  // No common ancestor (file is new in groot but also exists locally) → cannot
  // 3-way merge; surface both sides as a conflict.
  if (base === null) {
    return { kind: "conflict", content: twoWayConflictMarkers(file, ours, theirs), conflicts: 1 };
  }

  const merged = await gitMergeFile(file, ours, base, theirs);
  return merged.clean
    ? { kind: "auto-merged", content: merged.content }
    : { kind: "conflict", content: merged.content, conflicts: merged.conflicts };
}

/** Upstream commits (oneline) that touched a file since the last sync. */
async function fileCommits(
  tempDir: string,
  lastSyncCommit: string,
  file: string,
): Promise<string[]> {
  try {
    const { stdout } = await exec("git", [
      "-C",
      tempDir,
      "log",
      "--oneline",
      `${lastSyncCommit}..HEAD`,
      "--",
      file,
    ]);
    return stdout.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

async function resolveDefaultBranch(repoUrl: string): Promise<string> {
  try {
    const { stdout } = await exec("git", ["ls-remote", "--symref", repoUrl, "HEAD"]);
    // Output looks like: "ref: refs/heads/<branch>\tHEAD"
    const match = stdout.match(/ref:\s+refs\/heads\/(\S+)/);
    return match ? match[1] : "main";
  } catch {
    return "main";
  }
}

// ============================================================
// CHANGELOG EXTRACTION - Between versions or commits
// ============================================================

async function extractChangelog(
  tempDir: string,
  fromRef: string,
  toRef: string,
): Promise<string[]> {
  try {
    const changelogPath = join(tempDir, "CHANGELOG.md");

    // If fromRef is a commit SHA (no semver version in config), there is no
    // version string in CHANGELOG.md to anchor the stop boundary. Without this
    // guard the loop below never breaks and the entire changelog is captured,
    // so fall back to commit messages to capture only entries since the last
    // sync.
    if (/^[0-9a-f]{7,40}$/.test(fromRef)) {
      return extractCommitMessages(tempDir, fromRef, toRef);
    }

    try {
      await readFile(changelogPath, "utf-8");
    } catch {
      // No CHANGELOG.md, fall back to commit messages
      return extractCommitMessages(tempDir, fromRef, toRef);
    }

    const changelog = await readFile(changelogPath, "utf-8");
    const lines = changelog.split("\n");

    // Extract entries between the two versions
    // Look for ## headers with version numbers
    const entries: string[] = [];
    let capturing = false;

    for (const line of lines) {
      // Match version headers like "## 1.5.0" or "## v1.5.0"
      const versionMatch = line.match(/^## \[?v?(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        const version = versionMatch[1];
        if (version === fromRef.replace(/^v/, "")) {
          // We've reached the old version, stop capturing
          break;
        }
        capturing = true;
        entries.push(line);
        continue;
      }

      if (capturing && line.trim()) {
        entries.push(line);
      }
    }

    if (entries.length > 0) {
      return entries;
    }

    // Fallback to commit messages if changelog parsing didn't work
    return extractCommitMessages(tempDir, fromRef, toRef);
  } catch {
    return extractCommitMessages(tempDir, fromRef, toRef);
  }
}

async function extractCommitMessages(
  tempDir: string,
  fromRef: string,
  toRef: string,
): Promise<string[]> {
  try {
    const { stdout } = await exec(
      "git",
      ["log", "--oneline", `${fromRef}..${toRef}`, "--no-merges"],
      { cwd: tempDir },
    );
    return stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => `- ${line.replace(/^[a-f0-9]+ /, "")}`);
  } catch {
    return [];
  }
}

// ============================================================
// VERSION RESOLUTION - Resolve version tags to commits
// ============================================================

async function resolveLatestVersion(
  tempDir: string,
): Promise<{ version: string; commit: string } | null> {
  try {
    // Get the latest semver tag
    const { stdout } = await exec("git", ["tag", "--list", "v*", "--sort=-version:refname"], {
      cwd: tempDir,
    });
    const tags = stdout.split("\n").filter(Boolean);
    if (tags.length === 0) return null;

    const latestTag = tags[0];
    const { stdout: commitSha } = await exec("git", ["rev-parse", latestTag], { cwd: tempDir });

    return {
      version: latestTag.replace(/^v/, ""),
      commit: commitSha.trim(),
    };
  } catch {
    return null;
  }
}

// ============================================================
// RESULT / REPORT / MANIFEST TYPES
// ============================================================

interface MergedFile {
  file: string;
  content: string;
}

interface ConflictFile {
  file: string;
  content: string;
  conflicts: number;
  commits: string[];
}

interface SyncResult {
  autoApply: MergedFile[];
  autoMerged: MergedFile[];
  conflicts: ConflictFile[];
  drift: string[];
  skipped: { immutable: string[]; appSpecific: string[] };
  fromCommit: string;
  toCommit: string;
  fromVersion: string | null;
  toVersion: string | null;
  changelog: string[];
  breakingChanges: string[];
}

interface SyncReport {
  fromVersion: string | null;
  toVersion: string | null;
  fromCommit: string;
  toCommit: string;
  changelog: string[];
  breakingChanges: string[];
  autoApply: string[];
  autoMerged: string[];
  conflicts: { file: string; conflicts: number; commits: string[] }[];
  drift: string[];
  skipped: { immutable: string[]; appSpecific: string[] };
}

interface ConflictManifest {
  fromVersion: string | null;
  toVersion: string | null;
  fromCommit: string;
  toCommit: string;
  generatedAt: string;
  conflicts: { file: string; conflicts: number; commits: string[] }[];
}

async function writeSyncReport(projectRoot: string, report: SyncReport): Promise<void> {
  const reportPath = join(projectRoot, ".groot", "sync-report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
}

async function writeManifest(projectRoot: string, manifest: ConflictManifest): Promise<void> {
  const dir = join(projectRoot, ".groot", "needs-review");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

// ============================================================
// MAIN SYNC FUNCTION
// ============================================================

async function sync(
  projectRoot: string,
  command: "check" | "apply",
  skipConflicts: boolean,
): Promise<SyncResult> {
  // 1. Load and validate config
  const configPath = join(projectRoot, ".groot/boilerplate-sync.json");
  const rawConfig = JSON.parse(await readFile(configPath, "utf-8"));
  const config = SyncConfigSchema.parse(rawConfig);

  // 2. Acquire the boilerplate checkout (reuse ~/Code/<name> when clean).
  const defaultBranch = await resolveDefaultBranch(config.boilerplate.repo);
  const repo = await acquireBoilerplate({
    repoUrl: config.boilerplate.repo,
    name: config.boilerplate.name,
    defaultBranch,
    purpose: "sync",
    ensureCommitReachable: config.last_sync.commit,
    fetchTags: true,
  });
  const tempDir = repo.dir;

  try {
    // 3. Get changed files (exclude deletions)
    const { stdout: changedFiles } = await exec("git", [
      "-C",
      tempDir,
      "diff",
      "--name-only",
      "--diff-filter=d",
      `${config.last_sync.commit}..HEAD`,
    ]);

    const files = changedFiles.split("\n").filter(Boolean);

    // 4. Resolve version info
    const latestVersion = await resolveLatestVersion(tempDir);
    const { stdout: latestCommitRaw } = await exec("git", ["-C", tempDir, "rev-parse", "HEAD"]);
    const latestCommit = latestCommitRaw.trim();

    const result: SyncResult = {
      autoApply: [],
      autoMerged: [],
      conflicts: [],
      drift: [],
      skipped: { immutable: [], appSpecific: [] },
      fromCommit: config.last_sync.commit,
      toCommit: latestCommit,
      fromVersion: config.last_sync.version ?? null,
      toVersion: latestVersion?.version ?? null,
      changelog: [],
      breakingChanges: [],
    };

    if (files.length === 0) {
      return result;
    }

    // 5. Extract changelog + breaking changes between versions
    const fromRef = config.last_sync.version
      ? `v${config.last_sync.version}`
      : config.last_sync.commit;
    const toRef = latestVersion ? `v${latestVersion.version}` : "HEAD";
    result.changelog = await extractChangelog(tempDir, fromRef, toRef);

    const breakingCommitRe = /^(?:- )?(?:feat|fix)(?:\([\w.-]+\))?!:/i;
    result.breakingChanges = result.changelog.filter(
      (line) =>
        line.toLowerCase().includes("breaking") ||
        line.toLowerCase().includes("migration") ||
        breakingCommitRe.test(line),
    );

    // 6. Categorize + merge each changed file
    for (const file of files) {
      const validation = validateFilePath(file);
      if (!validation.valid) {
        result.skipped.immutable.push(file);
        console.error(`SECURITY: Skipped ${file} - ${validation.reason}`);
        continue;
      }

      const { action } = categorizeFile(file, config.additional_exclusions);

      if (action === "skip-immutable") {
        result.skipped.immutable.push(file);
        continue;
      }
      if (action === "skip-app") {
        result.skipped.appSpecific.push(file);
        continue;
      }
      if (action === "drift") {
        result.drift.push(file);
        continue;
      }

      // action === "sync" → attempt a three-way merge
      const outcome = await threeWayMerge(file, tempDir, projectRoot, config.last_sync.commit);
      switch (outcome.kind) {
        case "auto-apply":
          result.autoApply.push({ file, content: outcome.content });
          break;
        case "auto-merged":
          result.autoMerged.push({ file, content: outcome.content });
          break;
        case "conflict":
          result.conflicts.push({
            file,
            content: outcome.content,
            conflicts: outcome.conflicts,
            commits: await fileCommits(tempDir, config.last_sync.commit, file),
          });
          break;
        case "identical":
          // Already in sync — drop silently to keep output clean.
          break;
      }
    }

    // 7. Apply changes if requested
    const writtenClean = result.autoApply.length + result.autoMerged.length;
    if (command === "apply") {
      for (const { file, content } of [...result.autoApply, ...result.autoMerged]) {
        const dest = join(projectRoot, file);
        await mkdir(dirname(dest), { recursive: true });
        await writeFile(dest, content);
        console.log(`  + ${file}`);
      }

      // Write conflict markers into the working tree (skipped in CI mode so the
      // automated PR stays compilable; the manifest still records them).
      if (!skipConflicts) {
        for (const { file, content } of result.conflicts) {
          const dest = join(projectRoot, file);
          await mkdir(dirname(dest), { recursive: true });
          await writeFile(dest, content);
          console.log(`  ! ${file} (conflict markers)`);
        }
      }

      // Always record conflicts in the manifest so `pnpm groot:resolve` can
      // act on them regardless of whether markers were written to disk.
      if (result.conflicts.length > 0) {
        await writeManifest(projectRoot, {
          fromVersion: result.fromVersion,
          toVersion: result.toVersion,
          fromCommit: result.fromCommit,
          toCommit: result.toCommit,
          generatedAt: new Date().toISOString(),
          conflicts: result.conflicts.map((c) => ({
            file: c.file,
            conflicts: c.conflicts,
            commits: c.commits,
          })),
        });
      }

      // Advance the baseline when anything was processed. The manifest carries
      // the base/target commits for unresolved conflicts, so bumping here is
      // safe and prevents re-detecting the same files on the next sync.
      if (writtenClean + result.conflicts.length > 0) {
        const updatedConfig = {
          ...config,
          last_sync: {
            version: latestVersion?.version ?? config.last_sync.version,
            commit: latestCommit,
            date: new Date().toISOString(),
          },
        };
        await writeFile(configPath, JSON.stringify(updatedConfig, null, 2) + "\n");
        console.log("\nUpdated .groot/boilerplate-sync.json");
      }
    }

    // 8. Write machine-readable sync report for CI
    await writeSyncReport(projectRoot, {
      fromVersion: result.fromVersion,
      toVersion: result.toVersion,
      fromCommit: result.fromCommit,
      toCommit: result.toCommit,
      changelog: result.changelog,
      breakingChanges: result.breakingChanges,
      autoApply: result.autoApply.map((f) => f.file),
      autoMerged: result.autoMerged.map((f) => f.file),
      conflicts: result.conflicts.map((c) => ({
        file: c.file,
        conflicts: c.conflicts,
        commits: c.commits,
      })),
      drift: result.drift,
      skipped: result.skipped,
    });

    return result;
  } finally {
    await releaseBoilerplate(repo);
  }
}

// ============================================================
// CLI ENTRY POINT
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] as "check" | "apply";
  const skipConflicts = args.includes("--skip-conflicts");

  if (!["check", "apply"].includes(command)) {
    console.error("Usage: tsx sync.ts [check|apply] [--skip-conflicts]");
    console.error("");
    console.error("Commands:");
    console.error("  check  - Check for available changes (dry run)");
    console.error("  apply  - Apply safe changes, write conflict markers, update config");
    console.error("");
    console.error("Options:");
    console.error("  --skip-conflicts  - Don't write conflict markers (CI); only record them");
    process.exit(1);
  }

  const projectRoot = process.cwd();

  console.log("\n## Groot Sync v4\n");
  console.log(`Mode: ${command === "check" ? "dry run" : "apply"}\n`);

  const result = await sync(projectRoot, command, skipConflicts);

  // Version-aware header
  console.log(`\n## Results\n`);
  if (result.fromVersion || result.toVersion) {
    const from = result.fromVersion ? `v${result.fromVersion}` : result.fromCommit.slice(0, 7);
    const to = result.toVersion ? `v${result.toVersion}` : result.toCommit.slice(0, 7);
    console.log(`Version: ${from} → ${to}`);
  } else {
    console.log(`From: ${result.fromCommit.slice(0, 7)}`);
    console.log(`To:   ${result.toCommit.slice(0, 7)}`);
  }
  console.log();

  if (result.changelog.length > 0) {
    console.log("### Changelog");
    result.changelog.forEach((line) => console.log(`  ${line}`));
    console.log();
  }

  if (result.breakingChanges.length > 0) {
    console.log("### ⚠ Breaking Changes");
    result.breakingChanges.forEach((line) => console.log(`  ${line}`));
    console.log();
  }

  if (result.autoApply.length > 0) {
    console.log(`### Auto-Apply — clean (${result.autoApply.length})`);
    result.autoApply.forEach((f) => console.log(`  ${f.file}`));
    console.log();
  }

  if (result.autoMerged.length > 0) {
    console.log(`### Auto-Merged — 3-way (${result.autoMerged.length})`);
    result.autoMerged.forEach((f) => console.log(`  ${f.file}`));
    console.log();
  }

  if (result.conflicts.length > 0) {
    console.log(`### Conflicts — needs resolution (${result.conflicts.length})`);
    result.conflicts.forEach((c) => {
      const hunks = `${c.conflicts} conflict${c.conflicts === 1 ? "" : "s"}`;
      console.log(`  ${c.file} (${hunks})`);
    });
    console.log();
  }

  if (result.drift.length > 0) {
    console.log(`### Drift — new in groot, not synced (${result.drift.length})`);
    result.drift.forEach((f) => console.log(`  ${f}`));
    console.log();
  }

  const immCount = result.skipped.immutable.length;
  const appCount = result.skipped.appSpecific.length;
  if (immCount + appCount > 0) {
    console.log(`### Skipped — immutable: ${immCount}, app-specific: ${appCount}`);
    console.log();
  }

  // Summary
  console.log(`### Summary`);
  console.log(`  - Auto-apply:    ${result.autoApply.length}`);
  console.log(`  - Auto-merged:   ${result.autoMerged.length}`);
  console.log(`  - Conflicts:     ${result.conflicts.length}`);
  console.log(`  - Drift:         ${result.drift.length}`);
  console.log(`  - Skipped:       ${immCount + appCount} (immutable ${immCount}, app ${appCount})`);

  if (command === "check") {
    const applicable = result.autoApply.length + result.autoMerged.length + result.conflicts.length;
    if (applicable > 0) {
      console.log(`\n→ Run 'pnpm groot:sync' to apply ${applicable} change(s).`);
    }
  } else {
    const applied = result.autoApply.length + result.autoMerged.length;
    if (applied > 0) console.log(`\n✓ Applied ${applied} file(s).`);
  }

  if (result.conflicts.length > 0) {
    console.log(
      `\n⚠ ${result.conflicts.length} file(s) have conflicts. ` +
        `Run 'pnpm groot:resolve' to resolve them with the Cline SDK (GLM).`,
    );
  }

  console.log(`\n📄 Sync report written to .groot/sync-report.json`);
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
