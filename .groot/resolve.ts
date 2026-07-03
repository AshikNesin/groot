#!/usr/bin/env tsx
/**
 * Groot Resolve - AI-assisted conflict resolution for groot sync.
 *
 * After `pnpm groot:sync` records conflicts in
 * `.groot/needs-review/manifest.json`, this tool resolves each conflicting
 * file using the pi coding agent CLI (https://pi.dev). The model reads the
 * conflict markers, merges both sides intelligently while preserving local
 * customizations, and returns the fully resolved file; this tool validates the
 * output (no markers, non-empty) before writing anything, so a malformed model
 * response is never written to disk. The repo's AGENTS.md conventions are fed
 * to the model as part of its system prompt.
 *
 * The source of truth is the working tree plus local git state: files that
 * already contain markers are resolved directly with no boilerplate checkout,
 * and the merge base comes from the local baseline snapshot
 * (`refs/groot/baseline`) whenever it matches the manifest. A boilerplate
 * checkout is only acquired when markers must be regenerated (sync ran with
 * `--skip-conflicts`, e.g. CI) and a side is missing locally.
 *
 * Prerequisite: the pi CLI must be installed and authenticated
 * (`npm install -g --ignore-scripts @earendil-works/pi-coding-agent`, then an
 * API key env var such as `ZAI_API_KEY`, or `pi` + `/login`). Resolution runs
 * on whatever provider/model pi is configured with, unless overridden via
 * `--model` / `GROOT_RESOLVE_MODEL` / `GROOT_RESOLVE_PROVIDER`.
 *
 * Usage:
 *   pnpm groot:resolve                  - Resolve every conflict in the manifest
 *   pnpm groot:resolve --dry-run        - List pending conflicts, run nothing
 *   pnpm groot:resolve --file <path>    - Resolve a single file (repeatable)
 *   pnpm groot:resolve --no-verify      - Skip the post-resolution `pnpm check`
 *   pnpm groot:resolve --model <m>      - Model pattern or `provider/id`
 *                                         (default: pi's configured model)
 */
import { readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { z } from "zod";
import { loadConfig } from "./lib/config";
import {
  exec,
  gitMergeFile,
  twoWayConflictMarkers,
  resolveDefaultBranch,
  shaMatches,
  showBlob,
  CONFLICT_MARKER_RE,
} from "./lib/git";
import { acquireBoilerplate, releaseBoilerplate, type AcquiredRepo } from "./lib/acquire";
import { readBaselineInfo, BASELINE_REF } from "./lib/baseline";
import { PACKAGE_JSON_FILENAME, parseDiff3Markers, mergePackageJson } from "./package-json-merge";

// ============================================================
// SCHEMAS
// ============================================================

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

// ============================================================
// PI CLI - prerequisite check and model selection
// ============================================================

const PI_INSTALL_CMD = "npm install -g --ignore-scripts @earendil-works/pi-coding-agent";

async function checkPiCli(): Promise<void> {
  try {
    await exec("pi", ["--version"]);
  } catch {
    throw new Error(
      [
        "`pi` CLI is not installed.",
        "",
        "groot:resolve uses the pi coding agent (https://pi.dev) for AI conflict",
        "resolution. Install it with:",
        `  ${PI_INSTALL_CMD}`,
        "",
        "Then authenticate with your provider — either an API key env var (e.g.",
        "`export ZAI_API_KEY=...` for the ZAI Coding Plan) or run `pi` and use /login.",
      ].join("\n"),
    );
  }
}

/**
 * Provider/model CLI args for pi. When neither `--model` nor the env vars are
 * set, pi uses whatever model the developer has configured/last used, which
 * keeps resolution provider-agnostic (Anthropic, ZAI/GLM, Copilot, ...).
 */
function piModelArgs(opts: { model?: string }): string[] {
  const args: string[] = [];
  const provider = process.env.GROOT_RESOLVE_PROVIDER;
  const model = opts.model ?? process.env.GROOT_RESOLVE_MODEL;
  if (provider) args.push("--provider", provider);
  if (model) args.push("--model", model);
  return args;
}

// ============================================================
// SIDE SOURCING - base from the local baseline ref when possible,
// theirs from a boilerplate checkout only when actually needed.
// ============================================================

/**
 * Read the merge base for a file. Prefers the local baseline snapshot (no
 * network, survives upstream history rewrites); falls back to the boilerplate
 * checkout at the manifest's base commit.
 */
async function readBase(
  projectRoot: string,
  manifest: Manifest,
  file: string,
  getRepo: () => Promise<AcquiredRepo>,
): Promise<string | null> {
  const info = await readBaselineInfo(projectRoot);
  if (info && shaMatches(info.boilerplateCommit, manifest.fromCommit)) {
    const blob = await showBlob(projectRoot, BASELINE_REF, file);
    if (blob !== null) return blob.toString("utf-8");
    return null; // genuinely absent at base
  }
  try {
    const repo = await getRepo();
    const blob = await showBlob(repo.dir, manifest.fromCommit, file);
    return blob === null ? null : blob.toString("utf-8");
  } catch {
    return null;
  }
}

/** Read the upstream side at the manifest's target commit, or null if deleted. */
async function readTheirs(
  manifest: Manifest,
  file: string,
  getRepo: () => Promise<AcquiredRepo>,
): Promise<string | null> {
  const repo = await getRepo();
  const blob = await showBlob(repo.dir, manifest.toCommit, file);
  return blob === null ? null : blob.toString("utf-8");
}

/**
 * Ensure the local file contains conflict markers for the agent to resolve. If
 * the file already has markers (sync wrote them), use as-is. Otherwise rebuild
 * them from the base/target commits recorded in the manifest.
 */
async function ensureMarkers(
  file: string,
  projectRoot: string,
  manifest: Manifest,
  getRepo: () => Promise<AcquiredRepo>,
): Promise<"ready" | "missing-local" | "clean"> {
  const localPath = join(projectRoot, file);
  let ours: string;
  try {
    ours = await readFile(localPath, "utf-8");
  } catch {
    return "missing-local";
  }

  if (CONFLICT_MARKER_RE.test(ours)) return "ready";

  const theirs = await readTheirs(manifest, file, getRepo);
  if (theirs === null) return "clean"; // deleted upstream — nothing to merge
  if (ours === theirs) return "clean";

  const base = await readBase(projectRoot, manifest, file, getRepo);
  const markers =
    base === null
      ? twoWayConflictMarkers(file, ours, theirs)
      : (await gitMergeFile(file, ours, base, theirs)).content;

  await writeFile(localPath, markers);
  return "ready";
}

// ============================================================
// PI INVOCATION - locked-down single-shot `pi -p` run
// ============================================================

const RESOLVE_SYSTEM_PROMPT = [
  "You are a merge-conflict resolver. You receive a single file containing",
  "diff3-style git conflict markers and must produce the fully resolved file.",
  "",
  "Marker layout:",
  "  <<<<<<< <file> (current_repo)      — this repo's current version (PRESERVE its customizations)",
  "  ||||||| <file> (last_sync)         — groot at the commit last synced from (common ancestor)",
  "  =======",
  "  >>>>>>> <file> (groot_boilerplate)  — latest upstream groot boilerplate (ADOPT its improvements)",
  "",
  "Merge both sides intelligently: keep the local project's intent and customizations",
  "while incorporating the upstream improvements, and follow the conventions in AGENTS.md",
  "(included below when present).",
  "",
  "Respond with the COMPLETE resolved file content and NOTHING else:",
  "no commentary, no explanations, no markdown code fences. Your entire response",
  "is written to disk verbatim as the file. It MUST NOT contain any conflict",
  "markers (<<<<<<<, |||||||, =======, >>>>>>>).",
].join("\n");

function buildUserPrompt(file: string, commits: string[]): string {
  const commitList =
    commits.length > 0
      ? commits.map((c) => `  - ${c}`).join("\n")
      : "  (no commit details recorded)";
  return [
    `Resolve the git merge conflict in \`${file}\`.`,
    "",
    "Upstream commits that changed this file:",
    commitList,
    "",
    "The file content with conflict markers is provided as piped input below.",
    "Respond with only the fully resolved file content (markers removed).",
  ].join("\n");
}

/** Build the system prompt, appending AGENTS.md when present. Context-file
 * discovery is disabled on the pi run, so this append is the only (and
 * deterministic) way conventions reach the model. */
async function buildSystemPrompt(projectRoot: string): Promise<string> {
  let agentsMd = "";
  try {
    agentsMd = await readFile(join(projectRoot, "AGENTS.md"), "utf-8");
  } catch {
    agentsMd = "";
  }
  return agentsMd
    ? `${RESOLVE_SYSTEM_PROMPT}\n\n--- AGENTS.md ---\n${agentsMd}`
    : RESOLVE_SYSTEM_PROMPT;
}

/** Spawn `pi -p` with the conflicted content on stdin and capture stdout. */
function spawnPi(
  args: string[],
  stdinContent: string,
  cwd: string,
): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("pi", args, {
      cwd,
      env: { ...process.env, PI_SKIP_VERSION_CHECK: "1" },
      stdio: ["pipe", "pipe", "inherit"],
    });
    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout }));
    child.stdin.on("error", () => {});
    child.stdin.write(stdinContent);
    child.stdin.end();
  });
}

/**
 * Normalize a pi response into file content: reject empty output, unwrap a
 * single wrapping markdown code fence if the model added one despite
 * instructions, and ensure a trailing newline.
 */
export function extractFileContent(raw: string): string | null {
  let text = raw.replace(/^\s*\n/, "").replace(/\s+$/, "");
  if (!text) return null;
  const fenced = text.match(/^```[\w.+-]*\n([\s\S]*?)\n```$/);
  if (fenced) text = fenced[1];
  if (!text.trim()) return null;
  return text + "\n";
}

/**
 * Resolve one conflicted file via a locked-down, single-shot `pi -p` run: no
 * session, no tools, no extensions/skills/context files — just the merge
 * prompt in, the resolved file out. The output is validated (non-empty, no
 * conflict markers) before the caller writes it; one retry with feedback is
 * attempted when validation fails. Returns the resolved content, or null.
 */
async function runPi(
  file: string,
  projectRoot: string,
  conflictedContent: string,
  commits: string[],
  opts: { model?: string },
): Promise<string | null> {
  const baseArgs = [
    "-p",
    "--no-session",
    "--no-tools",
    "--no-extensions",
    "--no-skills",
    "--no-prompt-templates",
    "--no-context-files",
    ...piModelArgs(opts),
    "--system-prompt",
    await buildSystemPrompt(projectRoot),
  ];

  let feedback = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt = buildUserPrompt(file, commits) + feedback;
    let result: { code: number; stdout: string };
    try {
      result = await spawnPi([...baseArgs, prompt], conflictedContent, projectRoot);
    } catch (err) {
      console.error(`  ✗ pi run error: ${(err as Error).message}`);
      return null;
    }
    if (result.code !== 0) {
      console.error(`  ✗ pi exited with code ${result.code}`);
      return null;
    }

    const content = extractFileContent(result.stdout);
    if (content !== null && !CONFLICT_MARKER_RE.test(content)) {
      return content;
    }
    console.log(`  → attempt ${attempt} produced invalid output, retrying...`);
    feedback =
      "\n\nYour previous attempt was empty or still contained conflict markers. " +
      "Respond with ONLY the complete resolved file content — no fences, no commentary, " +
      "and absolutely no conflict markers.";
  }
  return null;
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
 * the baseline ref / manifest commits when markers are absent or 2-way. Only
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
    // as ours and source base/theirs from local git state / the checkout.
    oursText = content;
  }

  if (baseText === null) {
    baseText = await readBase(projectRoot, manifest, file, getRepo);
    if (baseText === null) return "fallback";
  }
  if (theirsText === null) {
    try {
      theirsText = await readTheirs(manifest, file, getRepo);
    } catch {
      return "fallback";
    }
    if (theirsText === null) return "clean"; // deleted upstream — nothing to merge
  }

  if (oursText === theirsText) return "clean";

  const merged = mergePackageJson(oursText, baseText, theirsText);
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

  const projectRoot = process.cwd();

  console.log("\n## Groot Resolve\n");

  // 1. Load config (validates this is a groot-synced project) + manifest
  const config = await loadConfig(projectRoot);

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
    console.log(
      `${conflicts.length} file(s) pending. Run without --dry-run to resolve with the pi coding agent.\n`,
    );
    return;
  }

  // 2. Lazy resources: the pi CLI and the boilerplate checkout are only
  //    required when actually needed. package.json resolves deterministically
  //    with neither.
  let repo: AcquiredRepo | undefined;
  const getRepo = async (): Promise<AcquiredRepo> => {
    if (!repo) {
      repo = await acquireBoilerplate({
        repoUrl: config.boilerplate.repo,
        name: config.boilerplate.name,
        defaultBranch: await resolveDefaultBranch(config.boilerplate.repo),
        purpose: "resolve",
        ensureCommitReachable: manifest.toCommit,
      });
    }
    return repo;
  };

  let piChecked = false;
  const ensurePiCli = async (): Promise<void> => {
    if (!piChecked) {
      await checkPiCli();
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
      await ensurePiCli();

      const state = await ensureMarkers(c.file, projectRoot, manifest, getRepo);

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

      const conflictedContent = await readFile(join(projectRoot, c.file), "utf-8");
      const resolvedContent = await runPi(c.file, projectRoot, conflictedContent, c.commits, {
        model,
      });
      if (resolvedContent !== null) {
        await writeFile(join(projectRoot, c.file), resolvedContent);
      }

      const stillConflicted = await fileHasMarkers(projectRoot, c.file);
      if (resolvedContent !== null && !stillConflicted) {
        console.log(`\n  ✓ Resolved ${c.file}`);
        resolved.push(c.file);
      } else {
        console.log(`\n  ✗ ${c.file} still has conflict markers — needs manual attention.`);
        failed.push(c.file);
      }
    }
  } finally {
    if (repo) await releaseBoilerplate(repo);
  }

  // 3. Update the manifest: drop resolved entries, keep failures.
  await pruneManifest(manifestPath, manifest, resolved);

  // 4. Summary + verification
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
