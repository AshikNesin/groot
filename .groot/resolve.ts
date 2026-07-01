#!/usr/bin/env tsx
/**
 * Groot Resolve - AI-assisted conflict resolution for groot sync.
 *
 * After `pnpm groot:sync` records conflicts in
 * `.groot/needs-review/manifest.json`, this tool resolves each conflicting
 * file using the pi coding agent (https://pi.dev) in non-interactive print
 * mode. pi reads the conflict markers, merges both sides intelligently while
 * preserving local customizations, and removes the markers. The repo's
 * AGENTS.md conventions are loaded by pi automatically.
 *
 * Usage:
 *   pnpm groot:resolve                  - Resolve every conflict in the manifest
 *   pnpm groot:resolve --dry-run        - List pending conflicts, run nothing
 *   pnpm groot:resolve --file <path>    - Resolve a single file (repeatable)
 *   pnpm groot:resolve --no-verify      - Skip the post-resolution `pnpm check`
 *   pnpm groot:resolve --model <m>      - Override pi model (e.g. sonnet)
 *   pnpm groot:resolve --thinking <l>   - pi thinking level (default: medium)
 */
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { acquireBoilerplate, releaseBoilerplate, type AcquiredRepo } from "./_acquire";
import { PACKAGE_JSON_FILENAME, parseDiff3Markers, mergePackageJson } from "./package-json-merge";

const exec = promisify(execFile);

// ============================================================
// SCHEMAS
// ============================================================

const SyncConfigSchema = z.object({
  boilerplate: z.object({
    name: z.string().min(1, "Boilerplate name is required"),
    repo: z.string().url("Invalid repository URL"),
  }),
  last_sync: z.object({
    version: z.string().optional(),
    commit: z.string().regex(/^[a-f0-9]{7,40}$/, "Invalid commit SHA"),
    date: z.string(),
  }),
  additional_exclusions: z.array(z.string()).default([]),
});

const ManifestSchema = z.object({
  fromVersion: z.string().nullable(),
  toVersion: z.string().nullable(),
  fromCommit: z.string(),
  toCommit: z.string(),
  generatedAt: z.string(),
  conflicts: z.array(
    z.object({
      file: z.string(),
      conflicts: z.number(),
      commits: z.array(z.string()).default([]),
    }),
  ),
});

type Manifest = z.infer<typeof ManifestSchema>;

const CONFLICT_MARKER_RE = /^<{7} /m;

// ============================================================
// PREREQUISITES
// ============================================================

async function resolveDefaultBranch(repoUrl: string): Promise<string> {
  try {
    const { stdout } = await exec("git", ["ls-remote", "--symref", repoUrl, "HEAD"]);
    const match = stdout.match(/ref:\s+refs\/heads\/(\S+)/);
    return match ? match[1] : "main";
  } catch {
    return "main";
  }
}

async function checkPi(): Promise<void> {
  try {
    await exec("pi", ["--version"]);
  } catch {
    throw new Error(
      [
        "The `pi` coding agent is not installed.",
        "",
        "Install it with:",
        "  npm install -g --ignore-scripts @earendil-works/pi-coding-agent",
        "",
        "Then authenticate (subscription or API key):",
        "  pi        # then /login",
        "  # or: export ANTHROPIC_API_KEY=...  (or OPENAI_API_KEY, etc.)",
        "",
        "See: https://pi.dev",
      ].join("\n"),
    );
  }
}

// ============================================================
// MARKER REGENERATION - rebuild conflict markers from the manifest
// when sync ran with --skip-conflicts (e.g. in CI).
// ============================================================

function twoWayConflictMarkers(file: string, ours: string, theirs: string): string {
  return [
    `<<<<<<< ${file} (local)`,
    ours.replace(/\n$/, ""),
    "=======",
    theirs.replace(/\n$/, ""),
    `>>>>>>> ${file} (groot)`,
    "",
  ].join("\n");
}

async function gitMergeFile(
  file: string,
  ours: string,
  base: string,
  theirs: string,
): Promise<string> {
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
        `${file} (local)`,
        "-L",
        `${file} (base)`,
        "-L",
        `${file} (groot)`,
        oursPath,
        basePath,
        theirsPath,
      ]);
      return stdout; // clean (shouldn't happen for a recorded conflict)
    } catch (err) {
      const e = err as { code?: number; stdout?: string };
      if (typeof e.code === "number" && e.code > 0 && typeof e.stdout === "string") {
        return e.stdout;
      }
      throw err;
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Ensure the local file contains conflict markers for pi to resolve. If the
 * file already has markers (sync wrote them), use as-is. Otherwise rebuild them
 * from the boilerplate base/target commits recorded in the manifest.
 */
async function ensureMarkers(
  file: string,
  projectRoot: string,
  manifest: Manifest,
  repo: AcquiredRepo,
): Promise<"ready" | "missing-local" | "clean"> {
  const localPath = join(projectRoot, file);
  let ours: string;
  try {
    ours = await readFile(localPath, "utf-8");
  } catch {
    return "missing-local";
  }

  if (CONFLICT_MARKER_RE.test(ours)) return "ready";

  // Rebuild from manifest commits.
  let base: string | null = null;
  try {
    const { stdout } = await exec("git", ["show", `${manifest.fromCommit}:${file}`], {
      cwd: repo.dir,
    });
    base = stdout;
  } catch {
    base = null;
  }

  let theirs: string;
  try {
    const { stdout } = await exec("git", ["show", `${manifest.toCommit}:${file}`], {
      cwd: repo.dir,
    });
    theirs = stdout;
  } catch {
    // File no longer exists in target — nothing to merge.
    return "clean";
  }

  if (ours === theirs) return "clean";

  const markers =
    base === null
      ? twoWayConflictMarkers(file, ours, theirs)
      : await gitMergeFile(file, ours, base, theirs);

  await writeFile(localPath, markers);
  return "ready";
}

// ============================================================
// PI INVOCATION
// ============================================================

function buildPrompt(file: string, commits: string[]): string {
  const commitList =
    commits.length > 0
      ? commits.map((c) => `  - ${c}`).join("\n")
      : "  (no commit details recorded)";
  return [
    `Resolve the git merge conflict in \`${file}\`.`,
    "",
    "The file currently contains diff3-style conflict markers:",
    `  <<<<<<< ${file} (local)   — this project's local version (PRESERVE its customizations)`,
    `  ||||||| ${file} (base)    — the common ancestor`,
    `  =======`,
    `  >>>>>>> ${file} (groot)   — the upstream groot boilerplate (ADOPT its improvements)`,
    "",
    "Upstream commits that changed this file:",
    commitList,
    "",
    "Merge both sides intelligently: keep the local project's intent and customizations",
    "while incorporating the upstream improvements. Follow the conventions in AGENTS.md.",
    `Edit ONLY \`${file}\`. Remove every conflict marker (<<<<<<<, |||||||, =======, >>>>>>>).`,
    "Do not leave any markers behind and do not touch other files.",
  ].join("\n");
}

function runPi(
  prompt: string,
  projectRoot: string,
  opts: { model?: string; thinking: string },
): Promise<number> {
  const args = [
    "-p",
    "--no-session",
    "-t",
    "read,edit,write,grep,find,ls",
    "--thinking",
    opts.thinking,
  ];
  if (opts.model) args.push("--model", opts.model);
  args.push(prompt);

  return new Promise((resolve) => {
    const child = spawn("pi", args, {
      cwd: projectRoot,
      stdio: "inherit",
      env: { ...process.env, PI_SKIP_VERSION_CHECK: "1" },
    });
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

function runCheck(projectRoot: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("pnpm", ["check"], { cwd: projectRoot, stdio: "inherit" });
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

// ============================================================
// DETERMINISTIC PACKAGE.JSON RESOLUTION
// ============================================================

/**
 * Resolve a `package.json` conflict deterministically, without the AI agent.
 *
 * Sources the three sides (ours/base/theirs) from the diff3 markers already in
 * the file (no boilerplate checkout needed in the common case), falling back to
 * the manifest's from/to commits when markers are absent or 2-way. Only
 * `scripts` / `dependencies` / `devDependencies` are 3-way-merged; all other
 * top-level keys are copied verbatim from the local file.
 *
 * Returns:
 *   `"resolved"`      — file written, conflict gone
 *   `"fallback"`      — could not merge cleanly; caller should use the AI flow
 *   `"missing-local"` — local file does not exist
 *   `"clean"`         — ours === theirs (no change needed)
 */
async function resolvePackageJson(
  file: string,
  projectRoot: string,
  manifest: Manifest,
  getRepo: () => Promise<AcquiredRepo>,
): Promise<"resolved" | "fallback" | "missing-local" | "clean"> {
  const localPath = join(projectRoot, file);
  let content: string;
  try {
    content = await readFile(localPath, "utf-8");
  } catch {
    return "missing-local";
  }

  let oursText: string;
  let baseText: string | null = null;
  let theirsText: string | null = null;

  const parsed = parseDiff3Markers(content);
  if (parsed) {
    // Common case: markers are already in the file (written by sync).
    oursText = parsed.ours;
    theirsText = parsed.theirs;
    baseText = parsed.base; // null when 2-way (no base sections)
  } else {
    // No markers — e.g. sync ran with --skip-conflicts. Treat the local file
    // as ours and source base/theirs from the recorded commits.
    oursText = content;
  }

  // Fetch any missing side from the boilerplate checkout (lazy).
  if (baseText === null || theirsText === null) {
    let repo: AcquiredRepo;
    try {
      repo = await getRepo();
    } catch {
      return "fallback";
    }
    if (baseText === null) {
      try {
        const { stdout } = await exec("git", ["show", `${manifest.fromCommit}:${file}`], {
          cwd: repo.dir,
        });
        baseText = stdout;
      } catch {
        return "fallback";
      }
    }
    if (theirsText === null) {
      try {
        const { stdout } = await exec("git", ["show", `${manifest.toCommit}:${file}`], {
          cwd: repo.dir,
        });
        theirsText = stdout;
      } catch {
        // File deleted upstream — nothing to merge.
        return "clean";
      }
    }
  }

  if (oursText === theirsText) return "clean";

  const merged = mergePackageJson(oursText, baseText!, theirsText!);
  if (!merged.ok) return "fallback";

  await writeFile(localPath, merged.text);
  return "resolved";
}

// ============================================================
// MAIN
// ============================================================

function parseArgValues(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && i + 1 < args.length) values.push(args[i + 1]);
  }
  return values;
}

function parseArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const noVerify = args.includes("--no-verify");
  const fileFilters = parseArgValues(args, "--file");
  const model = parseArgValue(args, "--model");
  const thinking = parseArgValue(args, "--thinking") ?? "medium";

  const projectRoot = process.cwd();

  console.log("\n## Groot Resolve\n");

  // 1. Load config (validates this is a groot-synced project) + manifest
  const configPath = join(projectRoot, ".groot/boilerplate-sync.json");
  let config: z.infer<typeof SyncConfigSchema>;
  try {
    config = SyncConfigSchema.parse(JSON.parse(await readFile(configPath, "utf-8")));
  } catch {
    throw new Error(`Config not found at ${configPath}. Is this a groot-synced project?`);
  }

  const manifestPath = join(projectRoot, ".groot/needs-review/manifest.json");
  let manifest: Manifest;
  try {
    manifest = ManifestSchema.parse(JSON.parse(await readFile(manifestPath, "utf-8")));
  } catch {
    console.log("No conflicts to resolve — `.groot/needs-review/manifest.json` not found.\n");
    console.log("Run `pnpm groot:sync` first if you expect pending conflicts.\n");
    return;
  }

  let conflicts = manifest.conflicts;
  if (fileFilters.length > 0) {
    conflicts = conflicts.filter((c) => fileFilters.includes(c.file));
  }

  if (conflicts.length === 0) {
    console.log("No matching conflicts in the manifest.\n");
    return;
  }

  const from = manifest.fromVersion ? `v${manifest.fromVersion}` : manifest.fromCommit.slice(0, 7);
  const to = manifest.toVersion ? `v${manifest.toVersion}` : manifest.toCommit.slice(0, 7);
  console.log(`Resolving conflicts from ${from} → ${to}\n`);

  conflicts.forEach((c) => {
    const hunks = `${c.conflicts} conflict${c.conflicts === 1 ? "" : "s"}`;
    console.log(`  ${c.file} (${hunks})`);
  });
  console.log();

  if (dryRun) {
    console.log(`${conflicts.length} file(s) pending. Run without --dry-run to resolve with pi.\n`);
    return;
  }

  // 2. Lazy resources: the AI flow (`pi`) and the boilerplate checkout are
  //    only acquired when actually needed. A package.json-only resolve merges
  //    deterministically and completes with no clone and no `pi` dependency.
  let repo: AcquiredRepo | undefined;
  const getRepo = async (): Promise<AcquiredRepo> => {
    if (!repo) {
      repo = await acquireBoilerplate({
        repoUrl: config.boilerplate.repo,
        name: config.boilerplate.name,
        defaultBranch: await resolveDefaultBranch(config.boilerplate.repo),
        purpose: "resolve",
        ensureCommitReachable: manifest.fromCommit,
      });
    }
    return repo;
  };

  let piChecked = false;
  const ensurePi = async (): Promise<void> => {
    if (!piChecked) {
      await checkPi();
      piChecked = true;
    }
  };

  const resolved: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];

  try {
    for (const c of conflicts) {
      console.log(`\n── Resolving ${c.file} ──\n`);

      // package.json is merged deterministically (never via the AI agent) so the
      // file can never be left in a malformed state by an LLM edit. Only falls
      // back to the AI flow when the programmatic merge can't handle it.
      if (c.file === PACKAGE_JSON_FILENAME) {
        const outcome = await resolvePackageJson(c.file, projectRoot, manifest, getRepo);
        if (outcome === "resolved") {
          console.log(`  ✓ Resolved ${c.file} via deterministic package.json merge`);
          resolved.push(c.file);
          continue;
        }
        if (outcome === "clean") {
          console.log(`  ✓ ${c.file} has no conflict markers — already resolved.`);
          resolved.push(c.file);
          continue;
        }
        if (outcome === "missing-local") {
          console.log(`  ⚠ ${c.file} does not exist locally — skipping.`);
          skipped.push(c.file);
          continue;
        }
        console.log(`  → Deterministic merge unavailable for ${c.file}; falling back to AI.`);
      }

      // AI resolution path
      await ensurePi();

      let state: "ready" | "missing-local" | "clean";
      if (await fileHasMarkers(projectRoot, c.file)) {
        state = "ready";
      } else {
        state = await ensureMarkers(c.file, projectRoot, manifest, await getRepo());
      }

      if (state === "missing-local") {
        console.log(`  ⚠ ${c.file} does not exist locally — skipping.`);
        skipped.push(c.file);
        continue;
      }
      if (state === "clean") {
        console.log(`  ✓ ${c.file} has no conflict markers — already resolved.`);
        resolved.push(c.file);
        continue;
      }

      const code = await runPi(buildPrompt(c.file, c.commits), projectRoot, { model, thinking });

      const stillConflicted = await fileHasMarkers(projectRoot, c.file);
      if (code === 0 && !stillConflicted) {
        console.log(`  ✓ Resolved ${c.file}`);
        resolved.push(c.file);
      } else {
        console.log(`  ✗ ${c.file} still has conflict markers — needs manual attention.`);
        failed.push(c.file);
      }
    }
  } finally {
    if (repo) await releaseBoilerplate(repo);
  }

  // 4. Update the manifest: drop resolved entries, keep failures.
  await pruneManifest(manifestPath, manifest, resolved);

  // 5. Summary + verification
  console.log(`\n## Summary\n`);
  console.log(`  - Resolved: ${resolved.length}`);
  console.log(`  - Failed:   ${failed.length}`);
  console.log(`  - Skipped:  ${skipped.length}`);

  if (failed.length > 0) {
    console.log(`\n⚠ Resolve the remaining files manually, then re-run 'pnpm groot:resolve'.`);
  }

  if (!noVerify && resolved.length > 0) {
    console.log(`\n→ Running 'pnpm check' to verify...\n`);
    const code = await runCheck(projectRoot);
    if (code === 0) {
      console.log(`\n✓ Checks passed.`);
    } else {
      console.log(`\n⚠ 'pnpm check' reported issues — review the resolved files.`);
    }
  }
}

async function fileHasMarkers(projectRoot: string, file: string): Promise<boolean> {
  try {
    return CONFLICT_MARKER_RE.test(await readFile(join(projectRoot, file), "utf-8"));
  } catch {
    return false;
  }
}

async function pruneManifest(
  manifestPath: string,
  manifest: Manifest,
  resolved: string[],
): Promise<void> {
  const remaining = manifest.conflicts.filter((c) => !resolved.includes(c.file));
  if (remaining.length === 0) {
    await rm(manifestPath, { force: true }).catch(() => {});
    return;
  }
  await writeFile(
    manifestPath,
    JSON.stringify({ ...manifest, conflicts: remaining }, null, 2) + "\n",
  ).catch(() => {});
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
