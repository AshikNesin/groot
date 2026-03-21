#!/usr/bin/env tsx
/**
 * Groot Sync v2 - Deterministic boilerplate sync tool
 *
 * Usage:
 *   pnpm groot:check  - Check for available changes
 *   pnpm groot:sync   - Apply safe changes
 */
import { readFile, writeFile, mkdir, rm, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, normalize } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import micromatch from "micromatch";

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

  // Server Core
  "server/src/core/**",
  "server/src/middlewares/**",
  "server/src/utils/**",
  "server/src/test-helpers.ts",

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
  "server/src/services/**",
  "server/src/controllers/**",
  "server/src/routes/**",
  "server/src/validations/**",
  "server/src/jobs/**",
  "server/src/models/**",
  "client/src/pages/**",
  "client/src/store/**",
  "client/src/services/**",
  "client/src/components/*.tsx",
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

// ============================================================
// MAIN SYNC FUNCTION
// ============================================================

interface SyncResult {
  autoApply: string[];
  needsReview: string[];
  skipped: string[];
  fromCommit: string;
  toCommit: string;
}

async function sync(projectRoot: string, command: "check" | "apply"): Promise<SyncResult> {
  // 1. Load and validate config
  const configPath = join(projectRoot, ".groot/boilerplate-sync.json");
  const rawConfig = JSON.parse(await readFile(configPath, "utf-8"));
  const config = SyncConfigSchema.parse(rawConfig);

  // 2. Create temp directory
  const tempDir = join(tmpdir(), `groot-sync-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  try {
    // 3. Clone boilerplate (shallow for speed)
    console.log(`Cloning ${config.boilerplate.repo}...`);
    await exec("git", [
      "clone",
      "--depth",
      "100",
      "--branch",
      "main",
      config.boilerplate.repo,
      tempDir,
    ]);

    // 4. Get changed files (exclude delet)
    const { stdout: changedFiles } = await exec("git", [
      "-C",
      tempDir,
      "diff",
      "--name-only",
      "--diff-filter=d",
      `${config.last_sync.commit}..HEAD`,
    ]);

    const files = changedFiles.split("\n").filter(Boolean);

    if (files.length === 0) {
      const { stdout: latestCommit } = await exec("git", ["-C", tempDir, "rev-parse", "HEAD"]);
      return {
        autoApply: [],
        needsReview: [],
        skipped: [],
        fromCommit: config.last_sync.commit,
        toCommit: latestCommit.trim(),
      };
    }

    // 5. Categorize files
    const result: SyncResult = {
      autoApply: [],
      needsReview: [],
      skipped: [],
      fromCommit: config.last_sync.commit,
      toCommit: "",
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

    // 6. Get latest commit
    const { stdout: latestCommit } = await exec("git", ["-C", tempDir, "rev-parse", "HEAD"]);
    result.toCommit = latestCommit.trim();

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

      // Update config
      const updatedConfig = {
        ...config,
        last_sync: {
          commit: result.toCommit,
          date: new Date().toISOString(),
        },
      };
      await writeFile(configPath, JSON.stringify(updatedConfig, null, 2) + "\n");
      console.log("\nUpdated .groot/boilerplate-sync.json");
    }

    return result;
  } finally {
    // Always cleanup
    await rm(tempDir, { recursive: true, force: true });
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

  console.log("\n## Groot Sync v2\n");
  console.log(`Mode: ${command === "check" ? "dry run" : "apply"}\n`);

  const result = await sync(projectRoot, command);

  console.log(`\n## Results\n`);
  console.log(`From: ${result.fromCommit.slice(0, 7)}`);
  console.log(`To:   ${result.toCommit.slice(0, 7)}\n`);

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
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
