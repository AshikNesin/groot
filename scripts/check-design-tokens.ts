#!/usr/bin/env tsx
/**
 * Design-token enforcement check.
 *
 * Bans raw Tailwind palette colors (gray-*, red-*, blue-*, green-*, …) outside
 * the token layer. The token layer is client/src/index.css (Tailwind v4
 * CSS-first: oklch `@theme inline` variable definitions).
 *
 * Everywhere else, colors must come from semantic classes:
 *   bg-primary, text-foreground, text-destructive, text-success,
 *   text-warning, text-info, text-muted-foreground, border-border,
 *   border-input, bg-muted, …
 *
 * Oxlint has no built-in rule for banning string patterns inside className
 * attributes, so this script is the enforcement mechanism. Wire it into CI or
 * a pre-commit hook alongside `vp check`.
 *
 * Usage:  tsx scripts/check-design-tokens.ts
 * Exit:   0 = clean, 1 = violations found.
 */
import { spawnSync } from "node:child_process";

const PALETTE =
  "(gray|slate|zinc|neutral|stone|green|red|blue|yellow|orange|purple|pink|indigo|emerald|amber|rose|teal|cyan|sky|lime)";
const PREFIX = "(text|bg|border|border-t|ring|ring-offset|divide|fill|stroke|from|to|via)";
const PATTERN = new RegExp(`\\b${PREFIX}-${PALETTE}-\\d`);

const ROOT = new URL("..", import.meta.url).pathname;
// Absolute path of the token layer, matching how rg emits file prefixes
// ("<ROOT>client/src/index.css:..."). Compared exactly so a future file whose
// path merely *contains* this fragment can't slip through the allowlist.
const TOKEN_LAYER = `${ROOT}client/src/index.css`;

let violations: { file: string; line: string }[] = [];
// rg exit codes: 0 = matches found, 1 = no matches (clean), 2 = error.
// spawnSync gives unambiguous status semantics (execSync's throwing on a
// missing-binary is murkier to classify).
const result = spawnSync(
  "rg",
  ["-n", "-g", "*.ts", "-g", "*.tsx", PATTERN.source, `${ROOT}client/src`],
  {
    encoding: "utf-8",
  },
);

if (result.error) {
  // rg binary unavailable (ENOENT) or failed to spawn — fail loudly so
  // enforcement can't silently degrade to a false-pass.
  console.error(
    "❌ Design-token check could not run: ripgrep (rg) failed to start — " +
      `${result.error.message}. Install rg before running this check.`,
  );
  process.exit(1);
}

const status = result.status;
if (status === 2) {
  console.error("❌ Design-token check failed: ripgrep reported an error:\n", result.stderr);
  process.exit(1);
}
if (status !== 0 && status !== 1) {
  console.error(`❌ Design-token check failed: unexpected ripgrep exit code ${status}.`);
  process.exit(1);
}

// status === 1 (no matches) → clean. status === 0 → parse matches.
if (status === 0 && result.stdout.trim()) {
  violations = result.stdout
    .trim()
    .split("\n")
    .filter((line) => line.split(":")[0] !== TOKEN_LAYER)
    .map((line) => {
      const [file, ...rest] = line.split(":");
      return { file, line: rest.join(":").trim() };
    });
}

if (violations.length > 0) {
  console.error(
    `\n❌ Design-token violation: raw palette colors found outside the token layer.\n` +
      `   Use semantic classes (text-foreground, text-destructive, bg-muted, …) instead.\n`,
  );
  for (const v of violations) {
    console.error(`   ${v.file}: ${v.line}`);
  }
  console.error(`\nAllowed raw colors ONLY in: client/src/index.css\n`);
  process.exit(1);
}

console.log("✓ No raw palette colors outside the token layer.");
process.exit(0);
