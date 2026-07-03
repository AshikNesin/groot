import { describe, it, expect } from "vite-plus/test";
import { reconcileFile, isBinary, type FileSides } from "../../../.groot/lib/reconcile";
import type { MergeFileResult } from "../../../.groot/lib/git";

/**
 * Unit tests for the pure per-file reconciliation decision table used by
 * groot sync v5. The `git merge-file` subprocess is injected, so every branch
 * is exercised deterministically without touching git or the filesystem.
 */

const buf = (s: string | null): Buffer | null => (s === null ? null : Buffer.from(s, "utf-8"));

function sides(
  path: string,
  ours: string | null,
  base: string | null,
  theirs: string | null,
): FileSides {
  return { path, ours: buf(ours), base: buf(base), theirs: buf(theirs) };
}

const neverMerge = async (): Promise<MergeFileResult> => {
  throw new Error("mergeFn must not be called for this case");
};

const cleanMerge = (content: string) => async (): Promise<MergeFileResult> => ({
  clean: true,
  content,
  conflicts: 0,
});

const conflictMerge =
  (content: string, conflicts = 1) =>
  async (): Promise<MergeFileResult> => ({ clean: false, content, conflicts });

describe("reconcileFile — upstream deletions", () => {
  it("ignores files that never were synced (no base, no theirs)", async () => {
    const outcome = await reconcileFile(sides("a.ts", "local", null, null), neverMerge);
    expect(outcome.kind).toBe("ignore");
  });

  it("treats deletion on both sides as identical", async () => {
    const outcome = await reconcileFile(sides("a.ts", null, "old", null), neverMerge);
    expect(outcome.kind).toBe("identical");
  });

  it("deletes locally when the file is unmodified since last sync", async () => {
    const outcome = await reconcileFile(sides("a.ts", "same", "same", null), neverMerge);
    expect(outcome.kind).toBe("delete");
  });

  it("flags locally-modified files deleted upstream for review", async () => {
    const outcome = await reconcileFile(sides("a.ts", "customized", "original", null), neverMerge);
    expect(outcome.kind).toBe("review-delete");
  });
});

describe("reconcileFile — additions and local deletions", () => {
  it("auto-applies files that are new upstream", async () => {
    const outcome = await reconcileFile(sides("a.ts", null, null, "new content"), neverMerge);
    expect(outcome).toMatchObject({ kind: "auto-apply" });
    if (outcome.kind === "auto-apply") {
      expect(outcome.content.toString()).toBe("new content");
    }
  });

  it("respects a local deletion of a synced file", async () => {
    const outcome = await reconcileFile(sides("a.ts", null, "old", "newer"), neverMerge);
    expect(outcome.kind).toBe("kept-local-deletion");
  });
});

describe("reconcileFile — text updates", () => {
  it("reports identical content as identical", async () => {
    const outcome = await reconcileFile(sides("a.ts", "same", "old", "same"), neverMerge);
    expect(outcome.kind).toBe("identical");
  });

  it("auto-applies upstream changes when untouched locally", async () => {
    const outcome = await reconcileFile(sides("a.ts", "v1", "v1", "v2"), neverMerge);
    expect(outcome).toMatchObject({ kind: "auto-apply" });
    if (outcome.kind === "auto-apply") {
      expect(outcome.content.toString()).toBe("v2");
    }
  });

  it("raises a 2-way conflict when both sides exist with no ancestor", async () => {
    const outcome = await reconcileFile(sides("a.ts", "mine\n", null, "theirs\n"), neverMerge);
    expect(outcome).toMatchObject({ kind: "conflict", conflicts: 1 });
    if (outcome.kind === "conflict") {
      expect(outcome.content).toContain("<<<<<<< a.ts (current_repo)");
      expect(outcome.content).toContain(">>>>>>> a.ts (groot_boilerplate)");
    }
  });

  it("returns auto-merged for a clean 3-way merge", async () => {
    const outcome = await reconcileFile(
      sides("a.ts", "local v1", "v1", "v2"),
      cleanMerge("merged"),
    );
    expect(outcome).toMatchObject({ kind: "auto-merged", content: "merged" });
  });

  it("treats a clean merge that reproduces ours as identical (no rewrite)", async () => {
    const outcome = await reconcileFile(
      sides("a.ts", "local v1", "v1", "v2"),
      cleanMerge("local v1"),
    );
    expect(outcome.kind).toBe("identical");
  });

  it("surfaces conflicts from the 3-way merge", async () => {
    const outcome = await reconcileFile(
      sides("a.ts", "local", "base", "upstream"),
      conflictMerge("<<< markers >>>", 2),
    );
    expect(outcome).toMatchObject({ kind: "conflict", conflicts: 2 });
  });
});

describe("reconcileFile — binary files", () => {
  it("auto-applies binary updates when untouched locally", async () => {
    const base = Buffer.from([0x00, 0x01, 0x02]);
    const theirs = Buffer.from([0x00, 0x09, 0x08]);
    const outcome = await reconcileFile(
      { path: "img.png", ours: Buffer.from(base), base, theirs },
      neverMerge,
    );
    expect(outcome).toMatchObject({ kind: "auto-apply" });
    if (outcome.kind === "auto-apply") {
      expect(outcome.content.equals(theirs)).toBe(true);
    }
  });

  it("never hands diverged binary files to the text merge", async () => {
    const outcome = await reconcileFile(
      {
        path: "img.png",
        ours: Buffer.from([0x00, 0xff]),
        base: Buffer.from([0x00, 0x01]),
        theirs: Buffer.from([0x00, 0x02]),
      },
      neverMerge,
    );
    expect(outcome.kind).toBe("binary-conflict");
  });

  it("detects binary content via NUL bytes", () => {
    expect(isBinary(Buffer.from([0x68, 0x00, 0x69]))).toBe(true);
    expect(isBinary(Buffer.from("plain text"))).toBe(false);
  });
});

describe("reconcileFile — package.json deterministic merge", () => {
  it("merges managed sections without markers", async () => {
    const base = JSON.stringify({ name: "child", dependencies: { zod: "^3.0.0" } }, null, 2);
    const ours = JSON.stringify(
      { name: "child-renamed", dependencies: { zod: "^3.0.0" } },
      null,
      2,
    );
    const theirs = JSON.stringify({ name: "groot", dependencies: { zod: "^4.0.0" } }, null, 2);

    const outcome = await reconcileFile(sides("package.json", ours, base, theirs), neverMerge);
    expect(outcome).toMatchObject({ kind: "auto-merged" });
    if (outcome.kind === "auto-merged") {
      const merged = JSON.parse(outcome.content);
      expect(merged.name).toBe("child-renamed"); // non-managed key: local wins
      expect(merged.dependencies.zod).toBe("^4.0.0"); // managed, unmodified: theirs
    }
  });

  it("is a no-op when only non-managed keys differ", async () => {
    const base = JSON.stringify({ name: "groot", scripts: { dev: "vite" } }, null, 2);
    const ours = JSON.stringify({ name: "child", scripts: { dev: "vite" } }, null, 2);
    const theirs = JSON.stringify({ name: "groot-2", scripts: { dev: "vite" } }, null, 2);

    const outcome = await reconcileFile(sides("package.json", ours, base, theirs), neverMerge);
    expect(outcome.kind).toBe("identical");
  });

  it("falls back to the text merge when package.json is unparseable", async () => {
    const outcome = await reconcileFile(
      sides("package.json", "{not json", "{}", '{"a":1}'),
      conflictMerge("<<< markers >>>"),
    );
    expect(outcome.kind).toBe("conflict");
  });
});
