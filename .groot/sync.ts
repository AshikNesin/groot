#!/usr/bin/env tsx
/**
 * Groot Sync v3 - Deterministic, version-aware boilerplate sync tool
 *
 * Usage:
 *   pnpm groot:check  - Check for available changes
 *   pnpm groot:sync   - Apply safe changes
 */
import { readFile, writeFile, mkdir, copyFile, access } from "node:fs/promises";
import { join, dirname, normalize } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import micromatch from "micromatch";
import { acquireBoilerplate, releaseBoilerplate } from "./_acquire";

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
] as const;

// ============================================================
// SYNC PATTERNS - Files that should be synced
// ============================================================

const SYNC_PATTERNS: readonly string[] = [
  // UI Components
  "client/src/components/ui/**",
  "client/src/components/layout/**",
  "client/src/lib/utils.ts",
  "client/src/lib/design-tokens.ts",
  "client/src/hooks/use-toast.ts",
  "client/src/index.css",

  // Server Core (drop-in infrastructure)
  "server/src/core/**",
  "server/src/test-helpers.ts",

  // Server Shared (reusable features: auth, storage, etc.)
  "server/src/shared/**",

  // Infrastructure
  "*.config.*",
  "tsconfig.json",
  ".github/workflows/**",
  ".vite-hooks/**",
  ".gitleaks.toml",
  "scripts/**",

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

  // App-specific client code (never sync)
  "client/src/pages/**",
  "client/src/store/**",
  "client/src/services/**",
  "client/src/components/*.tsx",

  // Other
  "README.md",
  "pnpm-lock.yaml",
] as const;

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
// CONFLICT DETECTION - Simple, git-based
// ============================================================

async function needsReview(
  filePath: string,
  tempDir: string,
  projectRoot: string,
  lastSyncCommit: string,
): Promise<boolean> {
  // Get content from last synced version using git
  try {
    const { stdout: lastSyncedContent } = await exec(
      "git",
      ["show", `${lastSyncCommit}:${filePath}`],
      { cwd: tempDir },
    );

    // Read local content
    const localPath = join(projectRoot, filePath);
    let localContent: string;
    try {
      localContent = await readFile(localPath, "utf-8");
    } catch {
      return false; // File doesn't exist locally, safe to add
    }

    // If local differs from last synced, it was modified locally
    return localContent !== lastSyncedContent;
  } catch {
    return false; // File is new in boilerplate, safe to add
  }
}

// ============================================================
// PATTERN MATCHING - Using micromatch for performance
// ============================================================

function categorizeFile(
  filePath: string,
  additionalExclusions: string[],
): { action: "sync" | "skip" | "merge"; reason: string } {
  // 1. Check immutable exclusions first (security)
  if (micromatch.isMatch(filePath, IMMUTABLE_EXCLUSIONS as string[])) {
    return { action: "skip", reason: "Immutable exclusion (security)" };
  }

  // 2. Check skip patterns
  const allSkipPatterns = [...SKIP_PATTERNS, ...additionalExclusions];
  if (micromatch.isMatch(filePath, allSkipPatterns)) {
    return { action: "skip", reason: "Matches skip pattern" };
  }

  // 3. Check for special merge files
  if (filePath === ".gitignore") {
    return { action: "merge", reason: "Uses append_missing strategy" };
  }
  if (filePath === "package.json") {
    return { action: "merge", reason: "Uses merge_deps strategy" };
  }

  // 4. Check sync patterns
  if (micromatch.isMatch(filePath, SYNC_PATTERNS as string[])) {
    return { action: "sync", reason: "Matches sync pattern" };
  }

  // 5. Default: skip (conservative)
  return { action: "skip", reason: "Does not match any sync pattern" };
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
      await access(changelogPath);
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
// SYNC REPORT - Machine-readable output for CI
// ============================================================

interface SyncReport {
  fromVersion: string | null;
  toVersion: string | null;
  fromCommit: string;
  toCommit: string;
  changelog: string[];
  autoApply: string[];
  needsReview: string[];
  skipped: string[];
  breakingChanges: string[];
}

async function writeSyncReport(projectRoot: string, report: SyncReport): Promise<void> {
  const reportPath = join(projectRoot, ".groot", "sync-report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
}

// ============================================================
// MAIN SYNC FUNCTION
// ============================================================

interface SyncResult {
  autoApply: string[];
  needsReview: string[];
  skipped: string[];
  fromCommit: string;
  toCommit: string;
  fromVersion: string | null;
  toVersion: string | null;
  changelog: string[];
  breakingChanges: string[];
}

async function sync(projectRoot: string, command: "check" | "apply"): Promise<SyncResult> {
  // 1. Load and validate config
  const configPath = join(projectRoot, ".groot/boilerplate-sync.json");
  const rawConfig = JSON.parse(await readFile(configPath, "utf-8"));
  const config = SyncConfigSchema.parse(rawConfig);

  // 2. Acquire the boilerplate checkout. Prefer a clean local clone at
  //    ~/Code/<name> (fast-forwarded to the default branch) to avoid
  //    re-cloning on every sync; fall back to a fresh clone otherwise.
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

    if (files.length === 0) {
      return {
        autoApply: [],
        needsReview: [],
        skipped: [],
        fromCommit: config.last_sync.commit,
        toCommit: latestCommit,
        fromVersion: config.last_sync.version ?? null,
        toVersion: latestVersion?.version ?? null,
        changelog: [],
        breakingChanges: [],
      };
    }

    // 5. Extract changelog between versions
    const fromRef = config.last_sync.version
      ? `v${config.last_sync.version}`
      : config.last_sync.commit;
    const toRef = latestVersion ? `v${latestVersion.version}` : "HEAD";
    const changelog = await extractChangelog(tempDir, fromRef, toRef);

    // Detect breaking changes from changelog
    const breakingCommitRe = /^(?:- )?(?:feat|fix)(?:\([\w.-]+\))?!:/i;
    const breakingChanges = changelog.filter(
      (line) =>
        line.toLowerCase().includes("breaking") ||
        line.toLowerCase().includes("migration") ||
        breakingCommitRe.test(line),
    );

    // 6. Categorize files
    const result: SyncResult = {
      autoApply: [],
      needsReview: [],
      skipped: [],
      fromCommit: config.last_sync.commit,
      toCommit: latestCommit,
      fromVersion: config.last_sync.version ?? null,
      toVersion: latestVersion?.version ?? null,
      changelog,
      breakingChanges,
    };

    for (const file of files) {
      // Security: Validate path
      const validation = validateFilePath(file);
      if (!validation.valid) {
        result.skipped.push(file);
        console.error(`SECURITY: Skipped ${file} - ${validation.reason}`);
        continue;
      }

      const { action } = categorizeFile(file, config.additional_exclusions);

      if (action === "skip") {
        result.skipped.push(file);
      } else if (action === "merge") {
        // Merge files always need review
        result.needsReview.push(file);
      } else {
        // Check if locally modified
        const modified = await needsReview(file, tempDir, projectRoot, config.last_sync.commit);
        if (modified) {
          result.needsReview.push(file);
        } else {
          result.autoApply.push(file);
        }
      }
    }

    // 7. Apply changes if requested
    if (command === "apply" && result.autoApply.length > 0) {
      console.log(`\nApplying ${result.autoApply.length} files...`);

      for (const file of result.autoApply) {
        const src = join(tempDir, file);
        const dest = join(projectRoot, file);

        // Ensure directory exists
        await mkdir(dirname(dest), { recursive: true });

        // Copy file
        await copyFile(src, dest);
        console.log(`  + ${file}`);
      }

      // Update config with version info
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

    // 8. Write machine-readable sync report for CI
    const report: SyncReport = {
      fromVersion: result.fromVersion,
      toVersion: result.toVersion,
      fromCommit: result.fromCommit,
      toCommit: result.toCommit,
      changelog: result.changelog,
      autoApply: result.autoApply,
      needsReview: result.needsReview,
      skipped: result.skipped,
      breakingChanges: result.breakingChanges,
    };
    await writeSyncReport(projectRoot, report);

    return result;
  } finally {
    // Always cleanup — but only directories we created; never a reused local checkout.
    await releaseBoilerplate(repo);
  }
}

// ============================================================
// CLI ENTRY POINT
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] as "check" | "apply";

  if (!["check", "apply"].includes(command)) {
    console.error("Usage: tsx sync.ts [check|apply]");
    console.error("");
    console.error("Commands:");
    console.error("  check  - Check for available changes (dry run)");
    console.error("  apply  - Apply safe changes and update config");
    process.exit(1);
  }

  const projectRoot = process.cwd();

  console.log("\n## Groot Sync v3\n");
  console.log(`Mode: ${command === "check" ? "dry run" : "apply"}\n`);

  const result = await sync(projectRoot, command);

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

  // Show changelog if available
  if (result.changelog.length > 0) {
    console.log("### Changelog");
    result.changelog.forEach((line) => console.log(`  ${line}`));
    console.log();
  }

  // Show breaking changes prominently
  if (result.breakingChanges.length > 0) {
    console.log("### ⚠ Breaking Changes");
    result.breakingChanges.forEach((line) => console.log(`  ${line}`));
    console.log();
  }

  if (result.autoApply.length > 0) {
    console.log("### Auto-Apply (Safe)");
    result.autoApply.forEach((f) => console.log(`  ${f}`));
    console.log();
  }

  if (result.needsReview.length > 0) {
    console.log("### Needs Review (Modified Locally)");
    result.needsReview.forEach((f) => console.log(`  ${f}`));
    console.log();
  }

  if (result.skipped.length > 0) {
    console.log("### Skipped");
    result.skipped.forEach((f) => console.log(`  ${f}`));
    console.log();
  }

  // Summary
  const total = result.autoApply.length + result.needsReview.length + result.skipped.length;
  console.log(`### Summary`);
  console.log(`Total: ${total} files`);
  console.log(`  - Auto-apply: ${result.autoApply.length}`);
  console.log(`  - Needs review: ${result.needsReview.length}`);
  console.log(`  - Skipped: ${result.skipped.length}`);

  if (command === "apply" && result.autoApply.length > 0) {
    console.log(`\n✓ Applied ${result.autoApply.length} files.`);
  }

  if (command === "check" && result.autoApply.length > 0) {
    console.log(`\n→ Run 'pnpm groot:sync' to apply ${result.autoApply.length} safe changes.`);
  }

  if (result.needsReview.length > 0) {
    console.log(`\n⚠ ${result.needsReview.length} files need manual review.`);
  }

  console.log(`\n📄 Sync report written to .groot/sync-report.json`);
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
