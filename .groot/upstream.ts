#!/usr/bin/env tsx
/**
 * Groot Upstream - Push child-repo fixes back to boilerplate
 *
 * Usage:
 *   pnpm groot:upstream           - Interactive mode: select files to upstream
 *   pnpm groot:upstream --dry-run - Show what would be upstreamed (no changes)
 *   pnpm groot:upstream --all     - Upstream all modified synced files
 */
import { readFile, mkdir, rm, copyFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, normalize } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createInterface } from "node:readline";
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

type SyncConfig = z.infer<typeof SyncConfigSchema>;

// ============================================================
// IMMUTABLE EXCLUSIONS - Cannot be overridden by config
// Security-critical files that must NEVER be synced/upstreamed
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
// SYNC PATTERNS - Files that should be synced (and upstreamed)
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
// SKIP PATTERNS - App-specific code to never sync/upstream
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
// PATTERN MATCHING - Using micromatch for performance
// ============================================================

function isUpstreamCandidate(
  filePath: string,
  additionalExclusions: string[],
): { eligible: boolean; reason: string } {
  // 1. Check immutable exclusions first (security)
  if (micromatch.isMatch(filePath, IMMUTABLE_EXCLUSIONS as string[])) {
    return { eligible: false, reason: "Immutable exclusion (security)" };
  }

  // 2. Check skip patterns
  const allSkipPatterns = [...SKIP_PATTERNS, ...additionalExclusions];
  if (micromatch.isMatch(filePath, allSkipPatterns)) {
    return { eligible: false, reason: "Matches skip pattern" };
  }

  // 3. Check sync patterns — only synced files can be upstreamed
  if (micromatch.isMatch(filePath, SYNC_PATTERNS as string[])) {
    return { eligible: true, reason: "Matches sync pattern" };
  }

  // 4. Default: not eligible (conservative)
  return { eligible: false, reason: "Does not match any sync pattern" };
}

// ============================================================
// DIFF HELPERS
// ============================================================

interface DiffStats {
  added: number;
  removed: number;
}

async function getDiffStats(
  filePath: string,
  localContent: string,
  boilerplateContent: string,
  tempDir: string,
): Promise<DiffStats> {
  // Write both versions to temp files and diff them
  const { writeFile: writeTmp } = await import("node:fs/promises");
  const localTmp = join(tempDir, `_upstream_local_${Date.now()}`);
  const bpTmp = join(tempDir, `_upstream_bp_${Date.now()}`);

  try {
    await writeTmp(localTmp, localContent);
    await writeTmp(bpTmp, boilerplateContent);

    const { stdout } = await exec("diff", ["--unified=0", bpTmp, localTmp]).catch((err) => {
      // diff exits with 1 when files differ — that's expected
      if (err.stdout) return { stdout: err.stdout as string };
      throw err;
    });

    const lines = stdout.split("\n");
    let added = 0;
    let removed = 0;

    for (const line of lines) {
      // Skip diff headers
      if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) continue;
      if (line.startsWith("+")) added++;
      else if (line.startsWith("-")) removed++;
    }

    return { added, removed };
  } finally {
    await rm(localTmp, { force: true }).catch(() => {});
    await rm(bpTmp, { force: true }).catch(() => {});
  }
}

// ============================================================
// REMOTE HELPERS - Default branch & repo slug resolution
// ============================================================

async function getDefaultBranch(repoUrl: string): Promise<string> {
  try {
    const { stdout } = await exec("git", ["ls-remote", "--symref", repoUrl, "HEAD"]);
    // Output looks like: "ref: refs/heads/<branch>\tHEAD"
    const match = stdout.match(/ref:\s+refs\/heads\/(\S+)/);
    return match ? match[1] : "main";
  } catch {
    return "main";
  }
}

/**
 * Extract an "OWNER/REPO" slug from any GitHub URL form for `gh pr create`.
 * Handles https://github.com/owner/repo(.git) and
 * ssh://git@github.com/owner/repo(.git) (both pass Zod's url() validation),
 * as well as the scheme-less SSH shorthand git@github.com:owner/repo(.git).
 */
function parseRepoSlug(repoUrl: string): string {
  try {
    const url = new URL(repoUrl);
    const parts = url.pathname
      .replace(/^\/+|\/+$/g, "")
      .replace(/\.git$/, "")
      .split("/");
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  } catch {
    // SSH shorthand without a scheme: git@github.com:owner/repo(.git)
    const match = repoUrl.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (match) return `${match[1]}/${match[2]}`;
  }
  throw new Error(`Could not parse GitHub owner/repo from URL: ${repoUrl}`);
}

// ============================================================
// PREREQUISITES CHECK
// ============================================================

async function checkGhCli(): Promise<void> {
  try {
    await exec("gh", ["--version"]);
  } catch {
    throw new Error(
      [
        "`gh` CLI is not installed.",
        "",
        "Install it with:",
        "  brew install gh",
        "",
        "Then authenticate:",
        "  gh auth login",
        "",
        "See: https://cli.github.com/",
      ].join("\n"),
    );
  }

  // Check authentication
  try {
    await exec("gh", ["auth", "status"]);
  } catch {
    throw new Error(
      ["`gh` CLI is not authenticated.", "", "Run:", "  gh auth login", "", "Then try again."].join(
        "\n",
      ),
    );
  }
}

async function getChildAppName(projectRoot: string): Promise<string> {
  const pkgPath = join(projectRoot, "package.json");
  try {
    const raw = JSON.parse(await readFile(pkgPath, "utf-8"));
    const name = raw.name;
    if (typeof name !== "string" || name.length === 0) {
      throw new Error("Missing `name` field in package.json");
    }
    return name;
  } catch (err) {
    if (err instanceof Error && err.message.includes("Missing")) throw err;
    throw new Error(`Could not read package.json at ${pkgPath}`);
  }
}

// ============================================================
// INTERACTIVE SELECTION
// ============================================================

interface UpstreamCandidate {
  filePath: string;
  stats: DiffStats;
}

async function promptSelection(candidates: UpstreamCandidate[]): Promise<UpstreamCandidate[]> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (question: string): Promise<string> =>
    new Promise((resolve) => rl.question(question, resolve));

  try {
    console.log("\nEnter file numbers (comma-separated), 'all', or 'q' to quit:");
    const answer = await ask("> ");

    const trimmed = answer.trim().toLowerCase();

    if (trimmed === "q" || trimmed === "") {
      console.log("\nAborted.");
      process.exit(0);
    }

    if (trimmed === "all") {
      return candidates;
    }

    const indices = trimmed
      .split(",")
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));

    const selected = indices
      .map((i) => candidates[i - 1])
      .filter((c): c is UpstreamCandidate => c !== undefined);

    if (selected.length === 0) {
      console.log("\nNo valid files selected. Aborted.");
      process.exit(0);
    }

    return selected;
  } finally {
    rl.close();
  }
}

// ============================================================
// FIND MODIFIED SYNCED FILES
// ============================================================

async function findModifiedSyncedFiles(
  projectRoot: string,
  config: SyncConfig,
  defaultBranch: string,
): Promise<{ candidates: UpstreamCandidate[]; tempDir: string }> {
  const tempDir = join(tmpdir(), `groot-upstream-diff-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  try {
    // Clone boilerplate (shallow for speed)
    console.log(`Cloning ${config.boilerplate.repo} (branch: ${defaultBranch})...`);
    await exec("git", [
      "clone",
      "--depth",
      "100",
      "--branch",
      defaultBranch,
      config.boilerplate.repo,
      tempDir,
    ]);

    // Ensure last_sync commit is reachable; deepen if needed
    try {
      await exec("git", ["-C", tempDir, "cat-file", "-t", config.last_sync.commit]);
    } catch {
      console.log("Last sync commit not in shallow history, fetching full history...");
      await exec("git", ["-C", tempDir, "fetch", "--unshallow"]);
    }

    // List all files at the last_sync commit that match sync patterns
    const { stdout: treeOutput } = await exec("git", [
      "-C",
      tempDir,
      "ls-tree",
      "-r",
      "--name-only",
      config.last_sync.commit,
    ]);

    const allBoilerplateFiles = treeOutput.split("\n").filter(Boolean);
    const candidates: UpstreamCandidate[] = [];

    for (const filePath of allBoilerplateFiles) {
      // Security: Validate path
      const validation = validateFilePath(filePath);
      if (!validation.valid) continue;

      // Check if this file is eligible for upstream
      const { eligible } = isUpstreamCandidate(filePath, config.additional_exclusions);
      if (!eligible) continue;

      // Check if the local file exists
      const localPath = join(projectRoot, filePath);
      try {
        await access(localPath);
      } catch {
        continue; // File doesn't exist locally, skip
      }

      // Get boilerplate content at last_sync commit
      let boilerplateContent: string;
      try {
        const { stdout } = await exec("git", ["show", `${config.last_sync.commit}:${filePath}`], {
          cwd: tempDir,
        });
        boilerplateContent = stdout;
      } catch {
        continue; // File doesn't exist at that commit
      }

      // Read local content
      const localContent = await readFile(localPath, "utf-8");

      // If they differ, this file was locally modified
      if (localContent !== boilerplateContent) {
        const stats = await getDiffStats(filePath, localContent, boilerplateContent, tempDir);
        candidates.push({ filePath, stats });
      }
    }

    return { candidates, tempDir };
  } catch (err) {
    // Clean up on error
    await rm(tempDir, { recursive: true, force: true });
    throw err;
  }
}

// ============================================================
// CREATE UPSTREAM PR
// ============================================================

async function createUpstreamPR(
  projectRoot: string,
  config: SyncConfig,
  selected: UpstreamCandidate[],
  childAppName: string,
  defaultBranch: string,
): Promise<string> {
  const tempDir = join(tmpdir(), `groot-upstream-pr-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  try {
    // Clone boilerplate fresh to its default branch
    console.log(`\nCloning ${config.boilerplate.repo} for PR (branch: ${defaultBranch})...`);
    await exec("git", [
      "clone",
      "--depth",
      "1",
      "--branch",
      defaultBranch,
      config.boilerplate.repo,
      tempDir,
    ]);

    // Create branch
    const dateSuffix = new Date().toISOString().slice(0, 10);
    const branchName = `upstream/${childAppName}/${dateSuffix}`;

    await exec("git", ["-C", tempDir, "checkout", "-b", branchName]);

    // Copy selected files from child repo into the groot clone
    for (const { filePath } of selected) {
      const src = join(projectRoot, filePath);
      const dest = join(tempDir, filePath);

      await mkdir(dirname(dest), { recursive: true });
      await copyFile(src, dest);
      console.log(`  + ${filePath}`);
    }

    // Stage and commit
    await exec("git", ["-C", tempDir, "add", "."]);

    const commitMessage = `fix: upstream changes from ${childAppName}`;
    await exec("git", ["-C", tempDir, "commit", "-m", commitMessage]);

    // Push branch
    console.log(`\nPushing branch ${branchName}...`);
    await exec("git", ["-C", tempDir, "push", "origin", branchName]);

    // Build PR body
    const fileList = selected
      .map((c) => `- \`${c.filePath}\` (+${c.stats.added} -${c.stats.removed})`)
      .join("\n");

    const prBody = [
      `## Upstream from \`${childAppName}\``,
      "",
      "### Files changed",
      fileList,
      "",
      `_Created by \`pnpm groot:upstream\`_`,
    ].join("\n");

    // Create PR using gh CLI
    const { stdout: prUrl } = await exec(
      "gh",
      [
        "pr",
        "create",
        "--repo",
        parseRepoSlug(config.boilerplate.repo),
        "--title",
        `fix: upstream from ${childAppName}`,
        "--body",
        prBody,
        "--base",
        defaultBranch,
        "--head",
        branchName,
      ],
      { cwd: tempDir },
    );

    return prUrl.trim();
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

// ============================================================
// MAIN
// ============================================================

type Mode = "dry-run" | "interactive" | "all";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const all = args.includes("--all");

  const mode: Mode = dryRun ? "dry-run" : all ? "all" : "interactive";

  const projectRoot = process.cwd();

  console.log("\n## Groot Upstream\n");
  console.log(`Mode: ${mode}\n`);

  // 1. Load and validate config
  const configPath = join(projectRoot, ".groot/boilerplate-sync.json");
  let rawConfig: unknown;
  try {
    rawConfig = JSON.parse(await readFile(configPath, "utf-8"));
  } catch {
    throw new Error(`Config file not found at ${configPath}. Is this a groot-synced project?`);
  }

  const config = SyncConfigSchema.parse(rawConfig);

  // 2. Check prerequisites (skip for dry-run)
  if (!dryRun) {
    await checkGhCli();
  }

  // 3. Get child app name
  const childAppName = await getChildAppName(projectRoot);

  // Resolve the boilerplate's default branch (don't assume "main")
  const defaultBranch = await getDefaultBranch(config.boilerplate.repo);

  // 4. Find modified synced files
  let diffTempDir: string | undefined;
  let candidates: UpstreamCandidate[];

  try {
    const result = await findModifiedSyncedFiles(projectRoot, config, defaultBranch);
    candidates = result.candidates;
    diffTempDir = result.tempDir;
  } catch (err) {
    throw new Error(
      `Failed to identify modified files: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    // Clean up the diff temp dir
    if (diffTempDir) {
      await rm(diffTempDir, { recursive: true, force: true });
    }
  }

  if (candidates.length === 0) {
    console.log("All synced files are up to date with boilerplate.\n");
    return;
  }

  // 5. Display candidates
  console.log(`### Modified Synced Files (candidates for upstream)`);
  candidates.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.filePath} (+${c.stats.added} -${c.stats.removed})`);
  });
  console.log();

  // 6. Dry run stops here
  if (dryRun) {
    console.log(`Found ${candidates.length} file(s) that differ from boilerplate.`);
    console.log("Run without --dry-run to upstream changes.\n");
    return;
  }

  // 7. Select files
  let selected: UpstreamCandidate[];

  if (all) {
    selected = candidates;
  } else {
    selected = await promptSelection(candidates);
  }

  console.log(`\n### Selected for Upstream`);
  selected.forEach((c) => {
    console.log(`  ${c.filePath}`);
  });
  console.log();

  // 8. Create upstream PR
  const prUrl = await createUpstreamPR(projectRoot, config, selected, childAppName, defaultBranch);

  console.log(`✓ Created PR: ${prUrl}\n`);
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
