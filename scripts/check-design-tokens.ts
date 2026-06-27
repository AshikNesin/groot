#!/usr/bin/env tsx
/**
 * Design-token enforcement check.
 *
 * Bans raw Tailwind palette colors (gray-*, red-*, blue-*, green-*, …) outside
 * the token layer. The token layer is:
 *   - client/src/index.css          (CSS variable definitions)
 *   - tailwind.config.js            (Tailwind theme wiring)
 *
 * Everywhere else, colors must come from semantic classes:
 *   bg-primary, text-foreground, text-destructive, text-success,
 *   text-warning, text-info, text-muted-foreground, border-border,
 *   border-input, bg-muted, …
 *
 * Oxlint has no built-in rule for banning string patterns inside className
 * attributes, so this script is the enforcement mechanism. Wire it into CI or
 * a pre-commit hook alongside `vp check`. See PLAN.md §Principles.
 *
 * Usage:  tsx scripts/check-design-tokens.ts
 * Exit:   0 = clean, 1 = violations found.
 */
import { execSync } from "node:child_process";

const PALETTE =
  "(gray|slate|zinc|green|red|blue|yellow|orange|purple|pink|indigo|emerald|amber|rose|teal|cyan|sky|lime)";
const PREFIX = "(text|bg|border|border-t|ring|ring-offset|divide|fill|stroke|from|to|via)";
const PATTERN = new RegExp(`\\b${PREFIX}-${PALETTE}-\\d`);

const ROOT = new URL("..", import.meta.url).pathname;
// Search TS/TSX under client/src, excluding the allowlisted token layer.
const SEARCH_CMD = `rg -n -g "*.ts" -g "*.tsx" "${PATTERN.source}" ${ROOT}client/src`;

let violations: { file: string; line: string }[] = [];
try {
  const out = execSync(SEARCH_CMD, { encoding: "utf-8" }).trim();
  if (out) {
    violations = out
      .split("\n")
      .filter((line) => {
        // Allowlist: token definitions live here.
        return !line.includes("client/src/index.css");
      })
      .map((line) => {
        const [file, ...rest] = line.split(":");
        return { file, line: rest.join(":").trim() };
      });
  }
} catch {
  // rg exits non-zero when no matches → that's the clean (passing) case.
  process.exit(0);
}

if (violations.length > 0) {
  console.error(
    `\n❌ Design-token violation: raw palette colors found outside the token layer.\n` +
      `   Use semantic classes (text-foreground, text-destructive, bg-muted, …) instead.\n`,
  );
  for (const v of violations) {
    console.error(`   ${v.file}: ${v.line}`);
  }
  console.error(`\nAllowed raw colors ONLY in: client/src/index.css, tailwind.config.js\n`);
  process.exit(1);
}

console.log("✓ No raw palette colors outside the token layer.");
process.exit(0);
