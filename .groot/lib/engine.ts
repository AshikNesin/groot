/**
 * Groot sync engine — full-tree snapshot reconciliation.
 *
 * Instead of diffing upstream commits (fragile: depends on JSON state and on
 * old commits staying reachable), every run reconciles the union of synced
 * files across three trees:
 *
 *   ours   = the child repo working tree
 *   base   = the baseline snapshot from the last sync (refs/groot/baseline,
 *            rebuilt from the boilerplate clone when missing or stale)
 *   theirs = the boilerplate default-branch HEAD
 *
 * This makes sync idempotent and self-healing: a crashed apply, a lost
 * manifest, or a stale report simply reconverges on the next run. Deletions
 * sync safely (only when the local file is unmodified since last sync), and
 * nothing is written until every decision has been computed. The baseline ref
 * and config are advanced last, so a mid-apply crash never loses state.
 */
import { readFile, writeFile, mkdir, rm, chmod } from "node:fs/promises";
import { join, dirname } from "node:path";
import { loadConfig, saveConfig, type SyncConfig } from "./config";
import { categorizeFile, validateFilePath } from "./patterns";
import {
  git,
  showBlob,
  listTree,
  hasCommit,
  resolveCommit,
  resolveDefaultBranch,
  resolveLatestVersion,
  fileCommits,
  gitMergeFile,
  dirtyPaths,
  shaMatches,
  type TreeEntry,
} from "./git";
import { acquireBoilerplate, releaseBoilerplate } from "./acquire";
import { readBaselineInfo, writeBaseline, BASELINE_REF } from "./baseline";
import { reconcileFile } from "./reconcile";
import { extractChangelog, findBreakingChanges } from "./changelog";

// ============================================================
// TYPES
// ============================================================

export interface SyncOptions {
  mode: "check" | "apply";
  /** Don't write conflict markers into the working tree (CI); manifest only. */
  skipConflicts: boolean;
  /** Overwrite files even when they have uncommitted git changes. */
  force: boolean;
}

interface WriteItem {
  file: string;
  content: Buffer | string;
  executable?: boolean;
}

export interface ConflictItem {
  file: string;
  content: string;
  conflicts: number;
  commits: string[];
}

export interface SyncResult {
  fromCommit: string;
  toCommit: string;
  fromVersion: string | null;
  toVersion: string | null;
  changelog: string[];
  breakingChanges: string[];
  autoApply: WriteItem[];
  autoMerged: WriteItem[];
  conflicts: ConflictItem[];
  binaryConflicts: string[];
  deleted: string[];
  reviewDeletions: string[];
  keptLocalDeletions: string[];
  drift: string[];
  skipped: { immutable: string[]; appSpecific: string[] };
}

export interface ConflictManifest {
  fromVersion: string | null;
  toVersion: string | null;
  fromCommit: string;
  toCommit: string;
  generatedAt: string;
  conflicts: { file: string; conflicts: number; commits: string[] }[];
}

export const MANIFEST_RELATIVE_PATH = ".groot/needs-review/manifest.json";
export const REPORT_RELATIVE_PATH = ".groot/sync-report.json";

// ============================================================
// BASE SOURCE - where base content is read from
// ============================================================

interface BaseSource {
  description: string;
  entries(): Promise<TreeEntry[]>;
  read(path: string): Promise<Buffer | null>;
}

function refBaseSource(projectRoot: string): BaseSource {
  return {
    description: `local baseline snapshot (${BASELINE_REF})`,
    entries: () => listTree(projectRoot, BASELINE_REF),
    read: (path) => showBlob(projectRoot, BASELINE_REF, path),
  };
}

function cloneBaseSource(cloneDir: string, commit: string): BaseSource {
  return {
    description: `boilerplate checkout at ${commit.slice(0, 7)}`,
    entries: () => listTree(cloneDir, commit),
    read: (path) => showBlob(cloneDir, commit, path),
  };
}

// ============================================================
// SYNC
// ============================================================

export async function runSync(projectRoot: string, opts: SyncOptions): Promise<SyncResult> {
  const config = await loadConfig(projectRoot);
  const exclusions = config.additional_exclusions;

  const defaultBranch = await resolveDefaultBranch(config.boilerplate.repo);
  const repo = await acquireBoilerplate({
    repoUrl: config.boilerplate.repo,
    name: config.boilerplate.name,
    defaultBranch,
    purpose: "sync",
    ensureCommitReachable: config.last_sync.commit,
    fetchTags: true,
  });

  try {
    const cloneDir = repo.dir;
    const targetCommit = await resolveCommit(cloneDir, "HEAD");
    const latestVersion = await resolveLatestVersion(cloneDir);

    // --- Resolve the base source: prefer the local baseline snapshot; fall
    // back to the boilerplate clone at the recorded last-sync commit.
    const lastSyncReachable = await hasCommit(cloneDir, config.last_sync.commit);
    const lastSyncSha = lastSyncReachable
      ? await resolveCommit(cloneDir, config.last_sync.commit)
      : config.last_sync.commit;

    const baselineInfo = await readBaselineInfo(projectRoot);
    const baselineMatches =
      baselineInfo !== null && shaMatches(baselineInfo.boilerplateCommit, lastSyncSha);

    let baseSource: BaseSource;
    if (baselineMatches) {
      baseSource = refBaseSource(projectRoot);
    } else if (lastSyncReachable) {
      baseSource = cloneBaseSource(cloneDir, lastSyncSha);
    } else {
      throw new Error(
        [
          `Last sync commit ${config.last_sync.commit} is not reachable in the boilerplate`,
          `checkout at ${cloneDir}, and no matching local baseline snapshot (${BASELINE_REF})`,
          `exists. Run \`git fetch --unshallow\` (or a full fetch) in the boilerplate checkout,`,
          `or fix last_sync.commit in .groot/boilerplate-sync.json.`,
        ].join("\n"),
      );
    }
    console.log(`Base: ${baseSource.description}`);

    // --- Candidate set: union of synced files in boilerplate HEAD and in the
    // baseline (the latter catches upstream deletions).
    const isSynced = (path: string): boolean =>
      validateFilePath(path).valid && categorizeFile(path, exclusions).action === "sync";

    const theirsEntries = new Map<string, TreeEntry>();
    for (const entry of await listTree(cloneDir, targetCommit)) {
      if (entry.type !== "blob" || entry.mode === "120000") continue;
      if (isSynced(entry.path)) theirsEntries.set(entry.path, entry);
    }

    const baseEntries = new Map<string, TreeEntry>();
    for (const entry of await baseSource.entries()) {
      if (entry.type !== "blob" || entry.mode === "120000") continue;
      if (isSynced(entry.path)) baseEntries.set(entry.path, entry);
    }

    const candidates = [...new Set([...theirsEntries.keys(), ...baseEntries.keys()])].sort();

    const result: SyncResult = {
      fromCommit: lastSyncSha,
      toCommit: targetCommit,
      fromVersion: config.last_sync.version ?? null,
      toVersion: latestVersion?.version ?? null,
      changelog: [],
      breakingChanges: [],
      autoApply: [],
      autoMerged: [],
      conflicts: [],
      binaryConflicts: [],
      deleted: [],
      reviewDeletions: [],
      keptLocalDeletions: [],
      drift: [],
      skipped: { immutable: [], appSpecific: [] },
    };

    // --- Report-only context: changelog, breaking changes, drift and skipped
    // files derived from the upstream commit range (best-effort).
    if (lastSyncReachable) {
      const fromRef = config.last_sync.version ? `v${config.last_sync.version}` : lastSyncSha;
      const toRef = latestVersion ? `v${latestVersion.version}` : "HEAD";
      result.changelog = await extractChangelog(cloneDir, fromRef, toRef);
      result.breakingChanges = findBreakingChanges(result.changelog);

      try {
        const changed = (
          await git(cloneDir, "diff", "--name-only", "--diff-filter=d", `${lastSyncSha}..HEAD`)
        )
          .split("\n")
          .filter(Boolean);
        for (const file of changed) {
          if (!validateFilePath(file).valid) continue;
          const { action } = categorizeFile(file, exclusions);
          if (action === "drift") result.drift.push(file);
          else if (action === "skip-immutable") result.skipped.immutable.push(file);
          else if (action === "skip-app") result.skipped.appSpecific.push(file);
        }
      } catch {
        /* report-only — never block the sync */
      }
    }

    // --- Reconcile every candidate file.
    for (const path of candidates) {
      const theirsEntry = theirsEntries.get(path) ?? null;
      const baseEntry = baseEntries.get(path) ?? null;
      const localPath = join(projectRoot, path);

      // Fast path: unchanged upstream since last sync (base blob == theirs
      // blob). Local state wins in every branch of the decision table, so the
      // only reportable outcome is a locally-deleted synced file.
      if (theirsEntry && baseEntry && theirsEntry.sha === baseEntry.sha) {
        const exists = await readFile(localPath)
          .then(() => true)
          .catch(() => false);
        if (!exists) result.keptLocalDeletions.push(path);
        continue;
      }

      const ours = await readFile(localPath).catch(() => null);
      const base = baseEntry ? await baseSource.read(path) : null;
      const theirs = theirsEntry ? await showBlob(cloneDir, targetCommit, path) : null;

      const outcome = await reconcileFile({ path, ours, base, theirs }, gitMergeFile);
      const executable = theirsEntry?.mode === "100755";

      switch (outcome.kind) {
        case "identical":
        case "ignore":
          break;
        case "auto-apply":
          result.autoApply.push({ file: path, content: outcome.content, executable });
          break;
        case "auto-merged":
          result.autoMerged.push({ file: path, content: outcome.content, executable });
          break;
        case "conflict":
          result.conflicts.push({
            file: path,
            content: outcome.content,
            conflicts: outcome.conflicts,
            commits: lastSyncReachable ? await fileCommits(cloneDir, lastSyncSha, path) : [],
          });
          break;
        case "binary-conflict":
          result.binaryConflicts.push(path);
          break;
        case "delete":
          result.deleted.push(path);
          break;
        case "review-delete":
          result.reviewDeletions.push(path);
          break;
        case "kept-local-deletion":
          result.keptLocalDeletions.push(path);
          break;
      }
    }

    // --- Apply phase. Everything is computed; now write, then advance state
    // last so a crash mid-apply never moves the baseline.
    if (opts.mode === "apply") {
      await applyChanges(projectRoot, result, opts);
      await advanceState(projectRoot, cloneDir, config, {
        targetCommit,
        version: latestVersion?.version ?? null,
        theirsEntries: [...theirsEntries.values()],
        baselineAlreadyCurrent:
          baselineInfo !== null && shaMatches(baselineInfo.boilerplateCommit, targetCommit),
      });
    }

    await writeSyncReport(projectRoot, result);

    return result;
  } finally {
    await releaseBoilerplate(repo);
  }
}

// ============================================================
// APPLY
// ============================================================

async function applyChanges(
  projectRoot: string,
  result: SyncResult,
  opts: SyncOptions,
): Promise<void> {
  const writes: WriteItem[] = [...result.autoApply, ...result.autoMerged];
  const touched = [
    ...writes.map((w) => w.file),
    ...result.deleted,
    ...(opts.skipConflicts ? [] : result.conflicts.map((c) => c.file)),
  ];

  if (touched.length > 0 && !opts.force) {
    const dirty = await dirtyPaths(projectRoot, touched);
    if (dirty.length > 0) {
      throw new Error(
        [
          "Refusing to overwrite files that have uncommitted changes:",
          ...dirty.map((f) => `  ${f}`),
          "",
          "Commit or stash them first, or re-run with --force.",
        ].join("\n"),
      );
    }
  }

  for (const { file, content, executable } of writes) {
    const dest = join(projectRoot, file);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, content);
    if (executable) await chmod(dest, 0o755);
    console.log(`  + ${file}`);
  }

  for (const file of result.deleted) {
    await rm(join(projectRoot, file), { force: true });
    console.log(`  - ${file}`);
  }

  // Write conflict markers into the working tree (skipped in CI mode so the
  // automated PR stays compilable; the manifest still records them).
  if (!opts.skipConflicts) {
    for (const { file, content } of result.conflicts) {
      const dest = join(projectRoot, file);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, content);
      console.log(`  ! ${file} (conflict markers)`);
    }
  }

  // Always record conflicts in the manifest so `pnpm groot:resolve` can act on
  // them regardless of whether markers were written to disk. When there are no
  // conflicts, drop any stale manifest from a previous run.
  const manifestPath = join(projectRoot, MANIFEST_RELATIVE_PATH);
  if (result.conflicts.length > 0) {
    const manifest: ConflictManifest = {
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
    };
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  } else {
    await rm(manifestPath, { force: true });
  }
}

async function advanceState(
  projectRoot: string,
  cloneDir: string,
  config: SyncConfig,
  target: {
    targetCommit: string;
    version: string | null;
    theirsEntries: TreeEntry[];
    baselineAlreadyCurrent: boolean;
  },
): Promise<void> {
  if (!target.baselineAlreadyCurrent) {
    await writeBaseline(
      projectRoot,
      cloneDir,
      target.targetCommit,
      target.version,
      target.theirsEntries,
    );
    console.log(`\nUpdated ${BASELINE_REF} → ${target.targetCommit.slice(0, 7)}`);
  }

  const commitChanged = !shaMatches(config.last_sync.commit, target.targetCommit);
  const versionChanged =
    target.version !== null && target.version !== (config.last_sync.version ?? null);
  if (commitChanged || versionChanged) {
    await saveConfig(projectRoot, {
      ...config,
      last_sync: {
        version: target.version ?? config.last_sync.version,
        commit: target.targetCommit,
        date: new Date().toISOString(),
      },
    });
    console.log("Updated .groot/boilerplate-sync.json");
  }
}

// ============================================================
// REPORT
// ============================================================

export interface SyncReport {
  fromVersion: string | null;
  toVersion: string | null;
  fromCommit: string;
  toCommit: string;
  changelog: string[];
  breakingChanges: string[];
  autoApply: string[];
  autoMerged: string[];
  conflicts: { file: string; conflicts: number; commits: string[] }[];
  binaryConflicts: string[];
  deleted: string[];
  reviewDeletions: string[];
  keptLocalDeletions: string[];
  drift: string[];
  skipped: { immutable: string[]; appSpecific: string[] };
}

async function writeSyncReport(projectRoot: string, result: SyncResult): Promise<void> {
  const report: SyncReport = {
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
    binaryConflicts: result.binaryConflicts,
    deleted: result.deleted,
    reviewDeletions: result.reviewDeletions,
    keptLocalDeletions: result.keptLocalDeletions,
    drift: result.drift,
    skipped: result.skipped,
  };
  await writeFile(join(projectRoot, REPORT_RELATIVE_PATH), JSON.stringify(report, null, 2) + "\n");
}
