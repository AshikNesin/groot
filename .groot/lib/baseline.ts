/**
 * Baseline snapshot management for groot sync.
 *
 * The "baseline" is the filtered boilerplate tree (synced files only) at the
 * last-synced boilerplate commit, stored inside the child repo as the git ref
 * `refs/groot/baseline`. It is the common ancestor for every three-way merge.
 *
 * Storing base content in git (instead of relying on the old commit staying
 * reachable in a boilerplate clone) makes merges resilient: once written, the
 * base survives upstream history rewrites, shallow clones, and lost JSON
 * state. The committed `boilerplate-sync.json` carries the commit SHA so any
 * machine (e.g. CI) can rebuild the ref from a boilerplate checkout.
 *
 * Snapshot commits are parentless, so transferring them between the clone and
 * the child repo never drags along boilerplate history.
 */
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { git, type TreeEntry } from "./git";

export const BASELINE_REF = "refs/groot/baseline";
const EXPORT_REF = "refs/groot/export";

export interface BaselineInfo {
  /** Full SHA of the boilerplate commit this snapshot was taken from. */
  boilerplateCommit: string;
  version: string | null;
}

/** Run git with stdin piped from `input`. */
function gitWithInput(
  args: string[],
  input: string,
  env: NodeJS.ProcessEnv,
): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout });
      else reject(new Error(`git ${args.join(" ")} failed (${code}): ${stderr}`));
    });
    child.stdin.on("error", () => {});
    child.stdin.write(input);
    child.stdin.end();
  });
}

/** Read baseline metadata from the ref's commit message, or null if absent. */
export async function readBaselineInfo(projectRoot: string): Promise<BaselineInfo | null> {
  let message: string;
  try {
    message = await git(projectRoot, "log", "-1", "--format=%B", BASELINE_REF);
  } catch {
    return null;
  }
  const commit = message.match(/^Boilerplate-Commit:\s*([a-f0-9]{7,40})\s*$/m)?.[1];
  if (!commit) return null;
  const version = message.match(/^Boilerplate-Version:\s*(\S+)\s*$/m)?.[1] ?? null;
  return { boilerplateCommit: commit, version: version === "(none)" ? null : version };
}

/**
 * Build a filtered snapshot commit in the boilerplate clone from the given
 * tree entries (already filtered to synced blobs) and transfer it into the
 * child repo as `refs/groot/baseline`.
 *
 * Objects already exist in the clone, so the snapshot tree is assembled purely
 * from `mode/sha/path` triples via a temporary index — no content is re-read
 * or re-hashed. The temporary export ref created in the clone is deleted
 * afterwards, whether the clone is owned or a reused local checkout.
 */
export async function writeBaseline(
  projectRoot: string,
  cloneDir: string,
  boilerplateCommit: string,
  version: string | null,
  entries: TreeEntry[],
): Promise<void> {
  const scratch = await mkdtemp(join(tmpdir(), "groot-baseline-"));
  const indexFile = join(scratch, "index");
  const env = { ...process.env, GIT_INDEX_FILE: indexFile };

  try {
    await gitWithInput(["-C", cloneDir, "read-tree", "--empty"], "", env);

    const indexInfo = entries.map((e) => `${e.mode} ${e.sha}\t${e.path}`).join("\n") + "\n";
    await gitWithInput(["-C", cloneDir, "update-index", "--index-info"], indexInfo, env);

    const { stdout: treeOut } = await gitWithInput(["-C", cloneDir, "write-tree"], "", env);
    const tree = treeOut.trim();

    const message = [
      "groot baseline snapshot",
      "",
      `Boilerplate-Commit: ${boilerplateCommit}`,
      `Boilerplate-Version: ${version ?? "(none)"}`,
      `Generated-At: ${new Date().toISOString()}`,
    ].join("\n");

    // Explicit identity: CI runners and fresh clones often have no git
    // user configured, and commit-tree refuses to guess one.
    const commit = (
      await git(
        cloneDir,
        "-c",
        "user.name=groot-sync",
        "-c",
        "user.email=groot-sync@localhost",
        "commit-tree",
        tree,
        "-m",
        message,
      )
    ).trim();

    await git(cloneDir, "update-ref", EXPORT_REF, commit);
    try {
      await git(
        projectRoot,
        "fetch",
        "--no-tags",
        "--force",
        cloneDir,
        `${EXPORT_REF}:${BASELINE_REF}`,
      );
    } finally {
      await git(cloneDir, "update-ref", "-d", EXPORT_REF).catch(() => {});
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
