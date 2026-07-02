#!/usr/bin/env tsx
/**
 * Groot Resolve - AI-assisted conflict resolution for groot sync.
 *
 * After `pnpm groot:sync` records conflicts in
 * `.groot/needs-review/manifest.json`, this tool resolves each conflicting
 * file using the Cline SDK (https://docs.cline.bot/sdk) in-process, powered by
 * the GLM Coding Plan (https://docs.z.ai/devpack/tool/cline). The agent reads
 * the conflict markers, merges both sides intelligently while preserving local
 * customizations, removes the markers, and writes the resolved file back. The
 * repo's AGENTS.md conventions are fed to the agent as its system prompt.
 *
 * The model runs entirely in-process via the `@cline/sdk` devDependency — no
 * global CLI binary or separate auth step is required. Set `ZAI_API_KEY`.
 *
 * Usage:
 *   pnpm groot:resolve                  - Resolve every conflict in the manifest
 *   pnpm groot:resolve --dry-run        - List pending conflicts, run nothing
 *   pnpm groot:resolve --file <path>    - Resolve a single file (repeatable)
 *   pnpm groot:resolve --no-verify      - Skip the post-resolution `pnpm check`
 *   pnpm groot:resolve --model <m>      - Override model id (default: glm-5.2)
 */
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { Agent, createTool } from "@cline/sdk";
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
// PROVIDER CONFIG (GLM Coding Plan via Cline SDK)
// ============================================================

// Defaults target the GLM Coding Plan (Z.AI) over Cline's `openai-compatible`
// provider. Override any of these with env vars (or --model for the model).
const GLM_DEFAULTS = {
  providerId: "openai-compatible",
  baseUrl: "https://api.z.ai/api/coding/paas/v4",
  modelId: "glm-5.2",
  apiKeyEnv: "ZAI_API_KEY",
} as const;

function resolveProviderConfig(opts: { model?: string }) {
  return {
    providerId: process.env.GROOT_RESOLVE_PROVIDER ?? GLM_DEFAULTS.providerId,
    baseUrl: process.env.GROOT_RESOLVE_BASE_URL ?? GLM_DEFAULTS.baseUrl,
    modelId: opts.model ?? process.env.GROOT_RESOLVE_MODEL ?? GLM_DEFAULTS.modelId,
    apiKey: process.env[GLM_DEFAULTS.apiKeyEnv] ?? process.env.GROOT_RESOLVE_API_KEY ?? undefined,
  };
}

function checkResolveConfig(): void {
  const { apiKey } = resolveProviderConfig({});
  if (!apiKey) {
    throw new Error(
      [
        `No API key set for groot:resolve.`,
        "",
        `Set your GLM (Z.AI) API key:`,
        `  export ${GLM_DEFAULTS.apiKeyEnv}=...`,
        "",
        "The Cline SDK devDependency is installed by `pnpm install` — no global",
        "binary is needed. To point at a different provider/model, set",
        "GROOT_RESOLVE_PROVIDER / GROOT_RESOLVE_BASE_URL / GROOT_RESOLVE_MODEL.",
        "",
        "See: https://docs.cline.bot/sdk  and  https://docs.z.ai/devpack/tool/cline",
      ].join("\n"),
    );
  }
}

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

// ============================================================
// MARKER REGENERATION - rebuild conflict markers from the manifest
// when sync ran with --skip-conflicts (e.g. in CI).
// ============================================================

function twoWayConflictMarkers(file: string, ours: string, theirs: string): string {
  return [
    `<<<<<<< ${file} (current_repo)`,
    ours.replace(/\n$/, ""),
    "=======",
    theirs.replace(/\n$/, ""),
    `>>>>>>> ${file} (groot_boilerplate)`,
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
        `${file} (current_repo)`,
        "-L",
        `${file} (last_sync)`,
        "-L",
        `${file} (groot_boilerplate)`,
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
 * Ensure the local file contains conflict markers for the agent to resolve. If
 * the file already has markers (sync wrote them), use as-is. Otherwise rebuild
 * them from the boilerplate base/target commits recorded in the manifest.
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
// CLINE / GLM INVOCATION
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
  "When you have the complete resolved file, call the `write_resolved_file` tool with the",
  "full file content. The content MUST NOT contain any conflict markers",
  "(<<<<<<<, |||||||, =======, >>>>>>>). Emit nothing else — the tool call is the answer.",
].join("\n");

function buildUserPrompt(file: string, commits: string[], content: string): string {
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
    "The file content with conflict markers:",
    "```",
    content,
    "```",
    "",
    "Call `write_resolved_file` with the fully resolved content (markers removed).",
  ].join("\n");
}

/** Build the system prompt, appending AGENTS.md when present (mirrors what the
 * old global agent loaded automatically). */
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

/**
 * Run the Cline agent (GLM Coding Plan) to resolve one conflicted file.
 *
 * The agent is given the conflicted file content and a single tool,
 * `write_resolved_file`, which it must call with the fully resolved content.
 * The tool refuses to write anything that still contains conflict markers, so
 * the file is never left in a malformed state. Returns 0 on a successful write,
 * 1 otherwise. (The caller still re-checks `fileHasMarkers` as the source of
 * truth.)
 */
async function runCline(
  file: string,
  projectRoot: string,
  conflictedContent: string,
  commits: string[],
  opts: { model?: string },
): Promise<number> {
  const cfg = resolveProviderConfig(opts);
  let written = false;

  const writeResolvedFile = createTool({
    name: "write_resolved_file",
    description: "Write the fully resolved file content. Must contain NO conflict markers.",
    inputSchema: z.object({
      content: z
        .string()
        .describe("The complete resolved file content with all conflict markers removed."),
    }),
    lifecycle: { completesRun: true },
    async execute({ content }: { content: string }) {
      if (CONFLICT_MARKER_RE.test(content)) {
        throw new Error("Resolved content still contains conflict markers — refusing to write.");
      }
      await writeFile(join(projectRoot, file), content);
      written = true;
      return "Resolved content written.";
    },
  });

  const agent = new Agent({
    providerId: cfg.providerId,
    modelId: cfg.modelId,
    apiKey: cfg.apiKey,
    baseUrl: cfg.baseUrl,
    systemPrompt: await buildSystemPrompt(projectRoot),
    tools: [writeResolvedFile],
    maxIterations: 50,
  });

  agent.subscribe((event) => {
    if (event.type === "assistant-text-delta") {
      process.stdout.write(event.text ?? "");
    }
  });

  try {
    await agent.run(buildUserPrompt(file, commits, conflictedContent));
  } catch (err) {
    console.error(`\n  ✗ Cline run error: ${(err as Error).message}`);
    return 1;
  }
  return written ? 0 : 1;
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
    console.log(
      `${conflicts.length} file(s) pending. Run without --dry-run to resolve with the Cline SDK (GLM).\n`,
    );
    return;
  }

  // 2. Lazy resources: the AI flow (Cline SDK) and the boilerplate checkout are
  //    only acquired when actually needed. A package.json-only resolve merges
  //    deterministically and completes with no clone and no API key.
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

  let configChecked = false;
  const ensureResolveConfig = (): void => {
    if (!configChecked) {
      checkResolveConfig();
      configChecked = true;
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
      ensureResolveConfig();

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

      const conflictedContent = await readFile(join(projectRoot, c.file), "utf-8");
      const code = await runCline(c.file, projectRoot, conflictedContent, c.commits, { model });

      const stillConflicted = await fileHasMarkers(projectRoot, c.file);
      if (code === 0 && !stillConflicted) {
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
