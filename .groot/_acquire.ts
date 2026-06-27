/**
 * Shared helpers for acquiring a ready-to-use checkout of the boilerplate repo.
 *
 * Used by `sync.ts` and `upstream.ts` to avoid re-cloning the boilerplate on
 * every invocation. When a clean local checkout exists at `~/Code/<name>` and
 * its origin matches the configured repo, we reuse it (fast-forwarding to the
 * default branch); otherwise we fall back to a fresh clone into a temp dir.
 */
import { access, mkdir, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export interface AcquiredRepo {
  /** Absolute path to a checkout of the boilerplate on its default branch. */
  dir: string;
  /**
   * True when we created the directory ourselves and are responsible for
   * cleaning it up. False when we reused a local checkout owned by the user.
   */
  owned: boolean;
}

export interface AcquireOptions {
  /** Boilerplate repository URL (HTTPS or SSH). */
  repoUrl: string;
  /** Boilerplate name from config — used to locate `~/Code/<name>`. */
  name: string;
  /** Default branch to ensure the checkout is on. */
  defaultBranch: string;
  /** Short label describing the operation, used in log messages and temp dir names. */
  purpose: string;
  /**
   * Optional commit SHA that must be reachable. If missing from a temp clone we
   * own, we deepen it with `fetch --unshallow`. For reused local checkouts we
   * never mutate history — we just warn.
   */
  ensureCommitReachable?: string;
  /** Whether to fetch tags after acquiring (needed for version resolution). */
  fetchTags?: boolean;
}

/**
 * Normalize a git remote URL to an `owner/repo` slug so HTTPS and SSH URLs for
 * the same repository compare equal:
 *   git@github.com:AshikNesin/groot.git  →  AshikNesin/groot
 *   https://github.com/AshikNesin/groot   →  AshikNesin/groot
 */
export function normalizeRepoSlug(url: string): string {
  return url
    .replace(/^(?:ssh:\/\/)?git@([^:/]+)[:/]/, "https://$1/")
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function isGitRepo(dir: string): Promise<boolean> {
  try {
    await exec("git", ["-C", dir, "rev-parse", "--is-inside-work-tree"]);
    return true;
  } catch {
    return false;
  }
}

async function getOriginUrl(dir: string): Promise<string | null> {
  try {
    const { stdout } = await exec("git", ["-C", dir, "remote", "get-url", "origin"]);
    return stdout.trim();
  } catch {
    return null;
  }
}

async function isClean(dir: string): Promise<boolean> {
  const { stdout } = await exec("git", ["-C", dir, "status", "--porcelain"]);
  return stdout.trim() === "";
}

async function hasCommit(dir: string, commit: string): Promise<boolean> {
  try {
    await exec("git", ["-C", dir, "cat-file", "-t", commit]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Acquire a ready-to-use checkout of the boilerplate on its default branch.
 *
 * Preference order:
 *   1. Reuse a local clone at `~/Code/<name>` when it exists, has a matching
 *      origin, is clean (no uncommitted changes), and can be fast-forwarded.
 *      This avoids re-cloning on every sync.
 *   2. Fall back to a fresh shallow clone into a temp directory.
 *
 * Callers must only clean up when the returned `owned` flag is true — use
 * {@link releaseBoilerplate} to handle that conditionally.
 */
export async function acquireBoilerplate(opts: AcquireOptions): Promise<AcquiredRepo> {
  const { repoUrl, name, defaultBranch, purpose, ensureCommitReachable, fetchTags } = opts;

  const localPath = join(homedir(), "Code", name);

  // 1. Try to reuse a local checkout
  try {
    if (
      (await pathExists(localPath)) &&
      (await isGitRepo(localPath)) &&
      (await hasCommit(localPath, "HEAD"))
    ) {
      const origin = await getOriginUrl(localPath);
      const originMatches =
        origin != null && normalizeRepoSlug(origin) === normalizeRepoSlug(repoUrl);

      if (originMatches) {
        if (!(await isClean(localPath))) {
          console.log(
            `Found local boilerplate at ${localPath} but it has uncommitted changes — ` +
              `falling back to a fresh clone.`,
          );
        } else {
          console.log(`Reusing local boilerplate checkout at ${localPath} (${purpose}).`);

          // Switch to the default branch and pull. These are best-effort: if
          // they fail we keep going with whatever state the clone is in rather
          // than aborting the whole sync.
          try {
            await exec("git", ["-C", localPath, "checkout", defaultBranch]);
          } catch {
            /* detached HEAD or branch absent — leave as-is */
          }
          try {
            await exec("git", ["-C", localPath, "pull", "--ff-only", "origin", defaultBranch]);
          } catch {
            console.log(`  (could not fast-forward — using current state)`);
          }

          if (fetchTags) {
            try {
              await exec("git", ["-C", localPath, "fetch", "--tags", "--force"]);
            } catch {
              /* non-fatal */
            }
          }

          if (ensureCommitReachable && !(await hasCommit(localPath, ensureCommitReachable))) {
            console.log(
              `  (warning: last sync commit ${ensureCommitReachable.slice(0, 7)} is not ` +
                `reachable in the local checkout; not mutating your clone — consider a full fetch.)`,
            );
          }

          return { dir: localPath, owned: false };
        }
      } else {
        console.log(
          `Found ${localPath} but its origin does not match ${repoUrl} — falling back to a fresh clone.`,
        );
      }
    }
  } catch {
    // Any unexpected error in the reuse path → fall back to clone below.
  }

  // 2. Fall back: fresh clone into a temp directory we own
  const tempDir = join(tmpdir(), `groot-${purpose.replace(/\W+/g, "-")}-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  console.log(`Cloning ${repoUrl} (branch: ${defaultBranch})...`);
  await exec("git", [
    "clone",
    "--depth",
    "100",
    "--branch",
    defaultBranch,
    ...(fetchTags ? ["--tags"] : []),
    repoUrl,
    tempDir,
  ]);

  // Shallow clone may miss some tags
  if (fetchTags) {
    try {
      await exec("git", ["-C", tempDir, "fetch", "--tags", "--force"]);
    } catch {
      /* non-fatal */
    }
  }

  // Ensure the last sync commit is reachable; deepen if needed
  if (ensureCommitReachable && !(await hasCommit(tempDir, ensureCommitReachable))) {
    console.log("Last sync commit not in shallow history, fetching full history...");
    try {
      await exec("git", ["-C", tempDir, "fetch", "--unshallow"]);
    } catch {
      /* already complete or offline — leave as-is */
    }
  }

  return { dir: tempDir, owned: true };
}

/**
 * Release an acquired repo, cleaning up only directories we created ourselves.
 * Never touches a reused user checkout.
 */
export async function releaseBoilerplate(repo: AcquiredRepo): Promise<void> {
  if (repo.owned) {
    await rm(repo.dir, { recursive: true, force: true });
  }
}
