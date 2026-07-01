import { describe, it, expect } from "vite-plus/test";
import {
  mergePackageJson,
  mergeObject3Way,
  parseDiff3Markers,
  detectIndent,
  PACKAGE_JSON_MERGE_KEYS,
} from "../../../.groot/package-json-merge";

/**
 * Deterministic package.json merge — the programmatic resolver used by
 * `.groot/resolve.ts` so package.json conflicts are never handed to the AI
 * agent. A malformed package.json breaks the whole toolchain, so this logic
 * must be airtight. These tests mirror the verification scenarios in
 * `.groot/feature-request.md` (request #8).
 *
 * Lives under tests/server/** so the server vitest config picks it up, even
 * though the code under test is sync tooling (.groot/**), not server code.
 */

/** Build a diff3 conflict file from three sides of a single object section. */
function conflictFile(
  section: string,
  oursBody: string,
  baseBody: string,
  theirsBody: string,
): string {
  return [
    "{",
    `  "${section}": {`,
    "<<<<<<< package.json (local)",
    oursBody,
    "||||||| package.json (base)",
    baseBody,
    "=======",
    theirsBody,
    ">>>>>>> package.json (groot)",
    "  }",
    "}",
    "",
  ].join("\n");
}

describe("mergeObject3Way", () => {
  it("keeps locally-changed keys (local wins)", () => {
    const merged = mergeObject3Way(
      { express: "^5.0.0", zod: "^3.0.0" },
      { express: "^3.0.0", zod: "^3.0.0" },
      { express: "^3.1.0", zod: "^3.2.0" },
    );
    expect(merged.express).toBe("^5.0.0"); // local changed -> local wins
    expect(merged.zod).toBe("^3.2.0"); // unmodified locally -> adopt theirs
  });

  it("accepts upstream deletion of an unmodified key", () => {
    const merged = mergeObject3Way(
      { build: "vite", dev: "vite" },
      { build: "vite", dev: "vite" },
      {
        dev: "vite",
      },
    );
    expect("build" in merged).toBe(false);
  });

  it("keeps a locally-deleted key deleted (local wins)", () => {
    const merged = mergeObject3Way({}, { vitest: "^1.0.0" }, { vitest: "^2.0.0" });
    expect("vitest" in merged).toBe(false);
  });

  it("adds net-new keys introduced only by theirs", () => {
    const merged = mergeObject3Way({ a: "1" }, { a: "1" }, { a: "1", b: "2" });
    expect(merged.b).toBe("2");
  });

  it("preserves ours key ordering, appending theirs-only keys last", () => {
    const merged = mergeObject3Way(
      { z: "1", a: "2" },
      { z: "1", a: "2" },
      { z: "1", a: "2", m: "3" },
    );
    expect(Object.keys(merged)).toEqual(["z", "a", "m"]);
  });
});

describe("parseDiff3Markers", () => {
  it("reconstructs ours/base/theirs from a single conflict hunk", () => {
    const parsed = parseDiff3Markers(
      conflictFile("scripts", '    "dev": "tsx"', '    "dev": "old"', '    "dev": "vite"'),
    )!;
    expect(parsed).not.toBeNull();
    expect(JSON.parse(parsed.ours).scripts.dev).toBe("tsx");
    expect(JSON.parse(parsed.base).scripts.dev).toBe("old");
    expect(JSON.parse(parsed.theirs).scripts.dev).toBe("vite");
  });

  it("reconstructs the base side faithfully", () => {
    const parsed = parseDiff3Markers(
      conflictFile("scripts", '    "dev": "tsx"', '    "dev": "old"', '    "dev": "vite"'),
    )!;
    expect(JSON.parse(parsed.base).scripts).toEqual({ dev: "old" });
  });

  it("handles multiple conflict hunks across different sections", () => {
    const file = [
      "{",
      '  "scripts": {',
      "<<<<<<< package.json (local)",
      '    "dev": "tsx watch",',
      "||||||| package.json (base)",
      '    "dev": "old",',
      "=======",
      '    "dev": "tsx watch src",',
      ">>>>>>> package.json (groot)",
      '    "build": "vite build"',
      "  },",
      '  "dependencies": {',
      "<<<<<<< package.json (local)",
      '    "express": "^5.0.0"',
      "||||||| package.json (base)",
      '    "express": "^3.0.0"',
      "=======",
      '    "express": "^3.1.0"',
      ">>>>>>> package.json (groot)",
      "  }",
      "}",
      "",
    ].join("\n");
    const parsed = parseDiff3Markers(file)!;
    expect(JSON.parse(parsed.ours).scripts.build).toBe("vite build"); // common line preserved
    expect(JSON.parse(parsed.theirs).dependencies.express).toBe("^3.1.0");
    expect(JSON.parse(parsed.base).scripts.dev).toBe("old");
  });

  it("reports base as null for 2-way merges (no base section)", () => {
    const twoWay = [
      "{",
      '  "scripts": {',
      "<<<<<<< package.json (local)",
      '    "dev": "tsx"',
      "=======",
      '    "dev": "vite"',
      ">>>>>>> package.json (groot)",
      "  }",
      "}",
      "",
    ].join("\n");
    const parsed = parseDiff3Markers(twoWay)!;
    expect(parsed.base).toBeNull();
    expect(JSON.parse(parsed.ours).scripts.dev).toBe("tsx");
  });

  it("returns null when there are no conflict markers", () => {
    expect(parseDiff3Markers(JSON.stringify({ a: 1 }, null, 2))).toBeNull();
  });
});

describe("mergePackageJson", () => {
  const j = (o: unknown, indent = 2) => JSON.stringify(o, null, indent) + "\n";

  it("merges only scripts/dependencies/devDependencies", () => {
    const r = mergePackageJson(
      j({ name: "app", version: "1.0.0", scripts: { a: "1" }, dependencies: { x: "^1" } }),
      j({ name: "app", version: "1.0.0", scripts: { a: "1" }, dependencies: { x: "^1" } }),
      j({
        name: "groot",
        version: "2.0.0",
        scripts: { a: "1", b: "2" },
        dependencies: { x: "^2" },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = JSON.parse(r.text);
    expect(out.name).toBe("app"); // project-owned, untouched
    expect(out.version).toBe("1.0.0"); // project-owned, untouched
    expect(out.scripts).toEqual({ a: "1", b: "2" }); // upstream addition adopted
    expect(out.dependencies.x).toBe("^2"); // unmodified locally -> upstream bump adopted
  });

  it("preserves a local version bump and adopts an upstream addition + bump", () => {
    const r = mergePackageJson(
      j({ dependencies: { express: "^5.0.0", zod: "^3.0.0" } }),
      j({ dependencies: { express: "^3.0.0", zod: "^3.0.0" } }),
      j({ dependencies: { express: "^3.0.0", zod: "^3.2.0", "@biomejs/biome": "^1.0.0" } }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = JSON.parse(r.text);
    expect(out.dependencies.express).toBe("^5.0.0"); // local wins
    expect(out.dependencies.zod).toBe("^3.2.0"); // unmodified -> adopt theirs
    expect(out.dependencies["@biomejs/biome"]).toBe("^1.0.0"); // theirs-only added
  });

  it("preserves a local-only key even when groot lacks it", () => {
    const r = mergePackageJson(
      j({ scripts: { "my:task": "echo hi", dev: "vite" } }),
      j({ scripts: { dev: "vite" } }),
      j({ scripts: { dev: "vite" } }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(JSON.parse(r.text).scripts["my:task"]).toBe("echo hi");
  });

  it("accepts upstream deletion of an unmodified key", () => {
    const r = mergePackageJson(
      j({ scripts: { build: "vite build", dev: "vite" } }),
      j({ scripts: { build: "vite build", dev: "vite" } }),
      j({ scripts: { dev: "vite" } }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect("build" in JSON.parse(r.text).scripts).toBe(false);
  });

  it("keeps a locally-deleted shared key deleted", () => {
    const r = mergePackageJson(
      j({ devDependencies: {} }),
      j({ devDependencies: { vitest: "^1.0.0" } }),
      j({ devDependencies: { vitest: "^2.0.0" } }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(JSON.parse(r.text).devDependencies).toBeUndefined();
  });

  it("drops an empty managed section instead of leaving {}", () => {
    const r = mergePackageJson(
      j({ dependencies: { x: "^1" }, devDependencies: {} }),
      j({ dependencies: { x: "^1" }, devDependencies: {} }),
      j({ dependencies: { x: "^1" }, devDependencies: {} }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect("devDependencies" in JSON.parse(r.text)).toBe(false);
  });

  it("leaves project metadata byte-identical", () => {
    const ours = j({
      name: "finance-api",
      version: "4.7.0",
      private: true,
      type: "module",
      engines: { node: "20" },
      packageManager: "pnpm@9.0.0",
      scripts: { dev: "vite" },
    });
    const r = mergePackageJson(
      ours,
      j({ scripts: { dev: "old" } }),
      j({ scripts: { dev: "new" } }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = JSON.parse(r.text);
    expect(out.name).toBe("finance-api");
    expect(out.version).toBe("4.7.0");
    expect(out.private).toBe(true);
    expect(out.type).toBe("module");
    expect(out.engines).toEqual({ node: "20" });
    expect(out.packageManager).toBe("pnpm@9.0.0");
  });

  it("preserves 2-space indentation", () => {
    const r = mergePackageJson(
      j({ scripts: { a: "1" } }),
      j({ scripts: { a: "1" } }),
      j({
        scripts: { a: "2" },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.text).toContain('\n  "scripts"');
  });

  it("preserves 4-space indentation", () => {
    const r = mergePackageJson(
      j({ scripts: { a: "1" } }, 4),
      j({ scripts: { a: "1" } }, 4),
      j(
        {
          scripts: { a: "2" },
        },
        4,
      ),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.text).toContain('\n    "scripts"');
  });

  it("preserves tab indentation", () => {
    const tabbed = JSON.stringify({ scripts: { a: "1" } }, null, "\t") + "\n";
    const r = mergePackageJson(
      tabbed,
      JSON.stringify({ scripts: { a: "1" } }, null, "\t"),
      JSON.stringify({ scripts: { a: "2" } }, null, "\t"),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.text).toContain('\n\t"scripts"');
  });

  it("preserves the trailing newline when present", () => {
    const r = mergePackageJson(
      JSON.stringify({ scripts: { a: "1" } }) + "\n",
      JSON.stringify({ scripts: { a: "1" } }) + "\n",
      JSON.stringify({ scripts: { a: "2" } }) + "\n",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.text.endsWith("\n")).toBe(true);
  });

  it("omits the trailing newline when absent", () => {
    const r = mergePackageJson(
      JSON.stringify({ scripts: { a: "1" } }),
      JSON.stringify({ scripts: { a: "1" } }),
      JSON.stringify({ scripts: { a: "2" } }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.text.endsWith("\n")).toBe(false);
  });

  it("falls back when a side is not valid JSON", () => {
    const r = mergePackageJson("{ broken", "{}", "{}");
    expect(r.ok).toBe(false);
  });

  it("falls back when a side is not a JSON object", () => {
    const r = mergePackageJson("[]", "{}", "{}");
    expect(r.ok).toBe(false);
  });

  it("falls back when a managed section is not an object", () => {
    const r = mergePackageJson(
      j({ scripts: "not-an-object" }),
      j({ scripts: { a: "1" } }),
      j({ scripts: { a: "2" } }),
    );
    expect(r.ok).toBe(false);
  });

  it("resolves a realistic multi-hunk diff3 conflict end-to-end", () => {
    const file = [
      "{",
      '  "name": "finance-api",',
      '  "scripts": {',
      "<<<<<<< package.json (local)",
      '    "dev": "tsx watch index.ts",',
      "||||||| package.json (base)",
      '    "dev": "tsx watch src",',
      "=======",
      '    "dev": "tsx watch src/index.ts",',
      ">>>>>>> package.json (groot)",
      '    "build": "vite build"',
      "  },",
      '  "dependencies": {',
      "<<<<<<< package.json (local)",
      '    "express": "^5.0.0"',
      "||||||| package.json (base)",
      '    "express": "^3.0.0"',
      "=======",
      '    "express": "^3.1.0"',
      ">>>>>>> package.json (groot)",
      "  }",
      "}",
      "",
    ].join("\n");
    const parsed = parseDiff3Markers(file)!;
    const r = mergePackageJson(parsed.ours, parsed.base!, parsed.theirs);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = JSON.parse(r.text);
    expect(out.name).toBe("finance-api"); // project-owned, untouched
    expect(out.scripts.dev).toBe("tsx watch index.ts"); // local changed -> local wins
    expect(out.scripts.build).toBe("vite build"); // common line preserved
    expect(out.dependencies.express).toBe("^5.0.0"); // local changed -> local wins
    // Output must be valid JSON with no markers.
    expect(r.text).not.toMatch(/<{7}|={7}|>{7}|\|{7}/);
  });
});

describe("module exports", () => {
  it("only manages scripts, dependencies, and devDependencies", () => {
    expect([...PACKAGE_JSON_MERGE_KEYS]).toEqual(["scripts", "dependencies", "devDependencies"]);
  });

  it("detectIndent infers 2-space and 4-space", () => {
    expect(detectIndent('{\n  "a": 1\n}')).toBe("  ");
    expect(detectIndent('{\n    "a": 1\n}')).toBe("    ");
    expect(detectIndent('{\n\t"a": 1\n}')).toBe("\t");
  });
});
