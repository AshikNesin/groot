/**
 * Best-effort changelog extraction between two boilerplate refs.
 *
 * Never throws: sync must keep working even when the changelog cannot be
 * derived (shallow clone, rewritten history, missing CHANGELOG.md).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { git } from "./git";

export async function extractChangelog(
  cloneDir: string,
  fromRef: string,
  toRef: string,
): Promise<string[]> {
  try {
    const changelogPath = join(cloneDir, "CHANGELOG.md");

    // If fromRef is a commit SHA (no semver version in config), there is no
    // version string in CHANGELOG.md to anchor the stop boundary. Without this
    // guard the loop below never breaks and the entire changelog is captured,
    // so fall back to commit messages to capture only entries since the last
    // sync.
    if (/^[0-9a-f]{7,40}$/.test(fromRef)) {
      return extractCommitMessages(cloneDir, fromRef, toRef);
    }

    let changelog: string;
    try {
      changelog = await readFile(changelogPath, "utf-8");
    } catch {
      // No CHANGELOG.md, fall back to commit messages
      return extractCommitMessages(cloneDir, fromRef, toRef);
    }

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
    return extractCommitMessages(cloneDir, fromRef, toRef);
  } catch {
    return extractCommitMessages(cloneDir, fromRef, toRef);
  }
}

async function extractCommitMessages(
  cloneDir: string,
  fromRef: string,
  toRef: string,
): Promise<string[]> {
  try {
    const out = await git(cloneDir, "log", "--oneline", `${fromRef}..${toRef}`, "--no-merges");
    return out
      .split("\n")
      .filter(Boolean)
      .map((line) => `- ${line.replace(/^[a-f0-9]+ /, "")}`);
  } catch {
    return [];
  }
}

const BREAKING_COMMIT_RE = /^(?:- )?(?:feat|fix)(?:\([\w.-]+\))?!:/i;

export function findBreakingChanges(changelog: string[]): string[] {
  return changelog.filter(
    (line) =>
      line.toLowerCase().includes("breaking") ||
      line.toLowerCase().includes("migration") ||
      BREAKING_COMMIT_RE.test(line),
  );
}
