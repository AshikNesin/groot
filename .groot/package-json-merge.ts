/**
 * Deterministic 3-way merge for `package.json`.
 *
 * `package.json` is the highest-risk file to hand to an LLM editor: it changes
 * in every boilerplate release (so it conflicts often) and a malformed result
 * — a trailing comma, a duplicate key, an unbalanced brace — breaks the whole
 * toolchain. This module merges it programmatically so the result is always
 * valid JSON, built from parsed objects.
 *
 * Scope: only `scripts`, `dependencies`, `devDependencies` are 3-way-merged;
 * every other top-level key (`name`, `version`, `private`, `engines`,
 * `packageManager`, pnpm overrides, …) is copied verbatim from the local file.
 *
 * Per-key semantics:
 *   - unchanged locally since base (ours[k] === base[k]) → adopt theirs[k];
 *     if theirs deleted k, accept the deletion.
 *   - changed locally (ours[k] !== base[k]) → keep ours[k] (local wins).
 *   - net-new in ours (not in base) → keep ours[k].
 *   - net-new in theirs (not in ours, not in base) → add theirs[k].
 *   - deleted locally (in base, not in ours) → stay deleted (local wins).
 *
 * This module is pure (no filesystem, no network, no side effects) so it can
 * be unit-tested in isolation. `resolve.ts` owns the I/O orchestration.
 */

export const PACKAGE_JSON_FILENAME = "package.json";

/** The only top-level keys that flow boilerplate → child on sync. */
export const PACKAGE_JSON_MERGE_KEYS = ["scripts", "dependencies", "devDependencies"] as const;

/** A plain, non-null, non-array object. */
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export interface ParsedDiff3 {
  /** The local side, reconstructed with conflict markers stripped. */
  ours: string;
  /**
   * The common-ancestor side, or `null` when the markers are 2-way (no
   * `|||||||` base sections) or when any hunk lacks a base section. Callers
   * must source base from elsewhere (e.g. the manifest base commit) when null.
   */
  base: string | null;
  /** The upstream side, reconstructed with conflict markers stripped. */
  theirs: string;
}

const MARKER_OURS = "<<<<<<<";
const MARKER_BASE = "|||||||";
const MARKER_SEP = "=======";
const MARKER_THEIRS = ">>>>>>>";

function isMarker(line: string, marker: string): boolean {
  return line === marker || line.startsWith(marker + " ");
}

/**
 * Reconstruct the three sides of a diff3 merge from conflict markers embedded
 * in a file. Returns `null` if no conflict markers are present.
 *
 * Handles multiple conflict hunks. If any hunk is 2-way (no `|||||||` base
 * section) the whole `base` is reported as `null`, since a partial base cannot
 * be parsed as valid JSON — the caller then falls back to sourcing base from
 * the recorded base commit.
 */
export function parseDiff3Markers(content: string): ParsedDiff3 | null {
  const lines = content.split("\n");
  const ours: string[] = [];
  const base: string[] = [];
  const theirs: string[] = [];
  let sawConflict = false;
  let allHunksHaveBase = true;

  type State = "common" | "ours" | "base" | "theirs";
  let state: State = "common";
  let hunkHasBase = false;

  for (const line of lines) {
    if (isMarker(line, MARKER_OURS)) {
      state = "ours";
      sawConflict = true;
      hunkHasBase = false;
    } else if (isMarker(line, MARKER_BASE)) {
      state = "base";
      hunkHasBase = true;
    } else if (isMarker(line, MARKER_SEP)) {
      // Reaching the separator directly from "ours" means this hunk is 2-way.
      if (state === "ours" && !hunkHasBase) allHunksHaveBase = false;
      state = "theirs";
    } else if (isMarker(line, MARKER_THEIRS)) {
      state = "common";
    } else {
      switch (state) {
        case "common":
          ours.push(line);
          base.push(line);
          theirs.push(line);
          break;
        case "ours":
          ours.push(line);
          break;
        case "base":
          base.push(line);
          break;
        case "theirs":
          theirs.push(line);
          break;
      }
    }
  }

  if (!sawConflict) return null;
  return {
    ours: ours.join("\n"),
    base: allHunksHaveBase ? base.join("\n") : null,
    theirs: theirs.join("\n"),
  };
}

/** Detect the indentation (spaces or a tab) of a JSON document. */
export function detectIndent(content: string): string {
  const m = content.match(/^([ \t]+)"/m);
  return m ? m[1] : "  ";
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (isPlainObject(a) && isPlainObject(b)) {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => k in b && deepEqual(a[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

/**
 * 3-way merge of a flat object (a `scripts` / `dependencies` section).
 *
 * Ordering: ours's keys first (in their original order), then keys introduced
 * only by theirs.
 */
export function mergeObject3Way(
  ours: Record<string, unknown>,
  base: Record<string, unknown>,
  theirs: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const k of Object.keys(ours)) {
    const inBase = k in base;
    const ourVal = ours[k];
    if (!inBase) {
      // Net-new in ours (or both sides added it) — keep ours.
      result[k] = ourVal;
    } else if (ourVal === base[k] || deepEqual(ourVal, base[k])) {
      // Unchanged locally — adopt theirs, including upstream deletion.
      if (k in theirs) result[k] = theirs[k];
    } else {
      // Changed locally — local wins.
      result[k] = ourVal;
    }
  }

  for (const k of Object.keys(theirs)) {
    if (!(k in result) && !(k in ours) && !(k in base)) {
      result[k] = theirs[k];
    }
  }

  return result;
}

export type PackageJsonMergeResult = { ok: true; text: string } | { ok: false; reason: string };

/**
 * Deterministically merge three `package.json` documents into one.
 *
 * Only `scripts` / `dependencies` / `devDependencies` are 3-way-merged; every
 * other top-level key is copied verbatim from `ours`. Formatting (indent +
 * trailing newline) is inferred from `ours`. Returns `{ ok: false }` on any
 * anomaly (unparseable JSON, non-object sides, non-object managed sections) so
 * the caller can fall back to the AI flow rather than writing a broken file.
 */
export function mergePackageJson(
  oursText: string,
  baseText: string,
  theirsText: string,
): PackageJsonMergeResult {
  let ours: unknown;
  let base: unknown;
  let theirs: unknown;
  try {
    ours = JSON.parse(oursText);
    base = JSON.parse(baseText);
    theirs = JSON.parse(theirsText);
  } catch (e) {
    return { ok: false, reason: `JSON parse failed: ${(e as Error).message}` };
  }

  if (!isPlainObject(ours) || !isPlainObject(base) || !isPlainObject(theirs)) {
    return { ok: false, reason: "package.json sides must be JSON objects" };
  }

  // Managed sections must be plain objects wherever they appear.
  const sides: Array<["ours" | "base" | "theirs", Record<string, unknown>]> = [
    ["ours", ours],
    ["base", base],
    ["theirs", theirs],
  ];
  for (const key of PACKAGE_JSON_MERGE_KEYS) {
    for (const [side, obj] of sides) {
      if (key in obj && !isPlainObject(obj[key])) {
        return { ok: false, reason: `package.json ${side}.${key} is not an object` };
      }
    }
  }

  // Start from a verbatim copy of ours — every project-owned key is untouched.
  const result: Record<string, unknown> = { ...ours };

  for (const key of PACKAGE_JSON_MERGE_KEYS) {
    const sectionInOurs = key in ours;
    const sectionInBase = key in base;

    // Local deleted the whole section after base had it — respect the deletion.
    if (!sectionInOurs && sectionInBase) {
      delete result[key];
      continue;
    }

    const oursSection = isPlainObject(ours[key]) ? ours[key] : {};
    const baseSection = isPlainObject(base[key]) ? base[key] : {};
    const theirsSection = isPlainObject(theirs[key]) ? theirs[key] : {};
    const merged = mergeObject3Way(oursSection, baseSection, theirsSection);

    if (Object.keys(merged).length === 0) {
      // Drop empty managed sections rather than leaving `{}`.
      delete result[key];
    } else {
      result[key] = merged;
    }
  }

  const indent = detectIndent(oursText);
  const trailingNewline = oursText.endsWith("\n");
  const text = JSON.stringify(result, null, indent) + (trailingNewline ? "\n" : "");
  return { ok: true, text };
}
