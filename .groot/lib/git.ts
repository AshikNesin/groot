/**
 * Shared git plumbing for the groot sync tooling.
 *
 * Everything here is a thin, typed wrapper over `git` subprocesses. Merge
 * *decisions* live in `reconcile.ts`; this module only executes.
 */
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const exec = promisify(execFile);

/** Run a git command in `dir` and return trimmed stdout. */
export async function git(dir: string, ...args: string[]): Promise<string> {
  const { stdout } = await exec("git", ["-C", dir, ...args]);
  return stdout.replace(/\n$/, "");
}

/** Read a blob at `ref:path` as a Buffer, or null when it does not exist. */
export async function showBlob(dir: string, ref: string, path: string): Promise<Buffer | null> {
  try {
    const { stdout } = await exec("git", ["-C", dir, "cat-file", "blob", `${ref}:${path}`], {
      encoding: "buffer",
      maxBuffer: 64 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return null;
  }
}

export interface TreeEntry {
  mode: string;
  type: string;
  sha: string;
  path: string;
}

/** List all entries of a tree-ish recursively. */
export async function listTree(dir: string, ref: string): Promise<TreeEntry[]> {
  const { stdout } = await exec("git", ["-C", dir, "ls-tree", "-r", "-z", ref], {
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout
    .split("\0")
    .filter(Boolean)
    .map((line) => {
      const [meta, path] = line.split("\t");
      const [mode, type, sha] = meta.split(" ");
      return { mode, type, sha, path };
    });
}

export async function hasCommit(dir: string, commit: string): Promise<boolean> {
  try {
    await exec("git", ["-C", dir, "cat-file", "-e", `${commit}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

export async function resolveCommit(dir: string, ref: string): Promise<string> {
  return git(dir, "rev-parse", `${ref}^{commit}`);
}

/** Compare two SHAs where either may be abbreviated. */
export function shaMatches(a: string, b: string): boolean {
  return a.startsWith(b) || b.startsWith(a);
}

export async function resolveDefaultBranch(repoUrl: string): Promise<string> {
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
 * Paths (from `paths`) that have uncommitted changes or are untracked in the
 * working tree — i.e. writing to them could destroy un-versioned work.
 */
export async function dirtyPaths(dir: string, paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const dirty: string[] = [];
  // Batch to keep argv well under OS limits.
  const chunkSize = 100;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { stdout } = await exec("git", [
      "-C",
      dir,
      "status",
      "--porcelain",
      "-z",
      "--",
      ...chunk,
    ]);
    for (const line of stdout.split("\0").filter(Boolean)) {
      dirty.push(line.slice(3));
    }
  }
  return dirty;
}

// ============================================================
// THREE-WAY MERGE PRIMITIVES
// ============================================================

export interface MergeFileResult {
  clean: boolean;
  content: string;
  conflicts: number;
}

/**
 * Run `git merge-file` over three temp files and capture the merged result.
 * Exit code 0 → clean merge; >0 → that many conflict hunks (markers in stdout).
 */
export async function gitMergeFile(
  file: string,
  ours: string,
  base: string,
  theirs: string,
): Promise<MergeFileResult> {
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

export const CONFLICT_MARKER_RE = /^<{7} /m;

// ============================================================
// HISTORY HELPERS
// ============================================================

/**
 * True iff `path` was ever committed in `dir` on the HEAD history.
 *
 * Used to tell a *real* local deletion (file was tracked at some point and is
 * now gone) from a *phantom* one (a prior sync wrote it into the working tree
 * but it was never committed, then swept — e.g. by `git clean -fd`). The two
 * look identical to the baseline (which is a snapshot of groot's tree, not
 * this repo's history); only this repo's own history distinguishes them.
 *
 * This is a history check (`git log -- <path>`), NOT a `cat-file -e HEAD:path`
 * check: a committed `git rm` also leaves the file absent from the HEAD tree,
 * so a HEAD-tree check would wrongly re-add deliberately-deleted files. A
 * non-empty log means the path was tracked at some point → honor the deletion.
 */
export async function wasEverTracked(dir: string, path: string): Promise<boolean> {
  try {
    const out = await git(dir, "log", "-1", "--format=%H", "--", path);
    return out.length > 0;
  } catch {
    return false;
  }
}

/** Upstream commits (oneline) that touched a file since the last sync. */
export async function fileCommits(dir: string, fromRef: string, file: string): Promise<string[]> {
  try {
    const out = await git(dir, "log", "--oneline", `${fromRef}..HEAD`, "--", file);
    return out.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/** Latest semver tag (v-prefixed) and the commit it points at, if any. */
export async function resolveLatestVersion(
  dir: string,
): Promise<{ version: string; commit: string } | null> {
  try {
    const out = await git(dir, "tag", "--list", "v*", "--sort=-version:refname");
    const tags = out.split("\n").filter(Boolean);
    if (tags.length === 0) return null;
    const latestTag = tags[0];
    const commit = await resolveCommit(dir, latestTag);
    return { version: latestTag.replace(/^v/, ""), commit };
  } catch {
    return null;
  }
}
