/**
 * Pure per-file reconciliation logic for groot sync.
 *
 * Given the three sides of a file (ours = child working tree, base = baseline
 * snapshot at last sync, theirs = boilerplate HEAD) decide what should happen.
 * The actual `git merge-file` subprocess is injected so this module stays
 * side-effect free and unit-testable.
 *
 * Decision table (see the sync spec):
 *   theirs missing:
 *     base missing            → ignore            (never was a synced file)
 *     ours missing            → identical         (deleted on both sides)
 *     ours == base            → delete            (safe deletion sync)
 *     ours != base            → review-delete     (modified locally, flag it)
 *   theirs present:
 *     ours missing, no base   → auto-apply        (new upstream file)
 *     ours missing, base      → kept-local-deletion (respect local delete)
 *     ours == theirs          → identical
 *     binary divergence       → auto-apply if ours == base, else binary-conflict
 *     package.json            → deterministic merge (fallback to markers)
 *     ours == base            → auto-apply theirs
 *     no base                 → conflict (2-way markers)
 *     else                    → 3-way merge → auto-merged | conflict
 */
import { twoWayConflictMarkers, type MergeFileResult } from "./git";
import { mergePackageJson, PACKAGE_JSON_FILENAME } from "../package-json-merge";

export interface FileSides {
  path: string;
  ours: Buffer | null;
  base: Buffer | null;
  theirs: Buffer | null;
}

export type ReconcileOutcome =
  | { kind: "identical" }
  | { kind: "ignore" }
  | { kind: "auto-apply"; content: Buffer }
  | { kind: "auto-merged"; content: string }
  | { kind: "conflict"; content: string; conflicts: number }
  | { kind: "binary-conflict" }
  | { kind: "delete" }
  | { kind: "review-delete" }
  | { kind: "kept-local-deletion"; theirs: Buffer };

export type MergeFn = (
  path: string,
  ours: string,
  base: string,
  theirs: string,
) => Promise<MergeFileResult>;

/** Same heuristic git uses: a NUL byte in the first 8000 bytes means binary. */
export function isBinary(buf: Buffer): boolean {
  return buf.subarray(0, 8000).includes(0);
}

export async function reconcileFile(sides: FileSides, mergeFn: MergeFn): Promise<ReconcileOutcome> {
  const { path, ours, base, theirs } = sides;

  if (theirs === null) {
    if (base === null) return { kind: "ignore" };
    if (ours === null) return { kind: "identical" };
    if (ours.equals(base)) return { kind: "delete" };
    return { kind: "review-delete" };
  }

  if (ours === null) {
    if (base === null) return { kind: "auto-apply", content: theirs };
    return { kind: "kept-local-deletion", theirs };
  }

  if (ours.equals(theirs)) return { kind: "identical" };

  const anyBinary = isBinary(ours) || isBinary(theirs) || (base !== null && isBinary(base));
  if (anyBinary) {
    if (base !== null && ours.equals(base)) return { kind: "auto-apply", content: theirs };
    return { kind: "binary-conflict" };
  }

  const oursText = ours.toString("utf-8");
  const theirsText = theirs.toString("utf-8");
  const baseText = base === null ? null : base.toString("utf-8");

  // package.json: merge deterministically instead of via `git merge-file` so
  // non-managed keys (`name`, `version`, `description`, `packageManager`, …)
  // never raise conflict markers. Falls through to the marker-based path when
  // the JSON is unparseable.
  if (path === PACKAGE_JSON_FILENAME && baseText !== null) {
    const merged = mergePackageJson(oursText, baseText, theirsText);
    if (merged.ok) {
      return merged.text === oursText
        ? { kind: "identical" }
        : { kind: "auto-merged", content: merged.text };
    }
  }

  // Untouched locally since last sync → take theirs.
  if (base !== null && ours.equals(base)) return { kind: "auto-apply", content: theirs };

  // No common ancestor (file is new in groot but also exists locally) → cannot
  // 3-way merge; surface both sides as a conflict.
  if (baseText === null) {
    return {
      kind: "conflict",
      content: twoWayConflictMarkers(path, oursText, theirsText),
      conflicts: 1,
    };
  }

  const merged = await mergeFn(path, oursText, baseText, theirsText);
  if (merged.clean) {
    // A clean merge that reproduces ours exactly (e.g. every upstream hunk was
    // already adopted, or unresolved markers from a prior sync where upstream
    // has not moved since) is a no-op, not a rewrite.
    return merged.content === oursText
      ? { kind: "identical" }
      : { kind: "auto-merged", content: merged.content };
  }
  return { kind: "conflict", content: merged.content, conflicts: merged.conflicts };
}
