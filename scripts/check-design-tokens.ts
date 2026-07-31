#!/usr/bin/env tsx
/**
 * Design-system enforcement check.
 *
 * Guards two classes of drift that a type-checker and a linter can't see:
 *
 *  1. **Token drift** — raw Tailwind palette colors (gray-*, red-*, blue-*, …)
 *     outside the token layer (packages/shell/src/index.css, Tailwind v4
 *     CSS-first `@theme inline` oklch variables). Colors must come from
 *     semantic classes: bg-primary, text-foreground, text-destructive,
 *     text-success, text-warning, text-info, text-muted-foreground,
 *     border-border, bg-muted, …
 *
 *  2. **Structural drift** — hand-rolling a surface/state that already exists
 *     as a shared primitive. This is what let the UI diverge in the first
 *     place: `Card`, `Table`, `EmptyState`, and the component `gap` were all
 *     available, but re-implementing them inline was easier than importing
 *     them, so each page grew its own variant.
 *
 * Oxlint has no built-in rule for banning string patterns inside className
 * attributes, so this script is the enforcement mechanism. It runs from the
 * pre-commit hook (`vp staged` → `npm run check:tokens`) and from CI
 * (.github/workflows/check-design-tokens.yml), which is the non-bypassable
 * layer for `--no-verify` commits.
 *
 * Usage:  tsx scripts/check-design-tokens.ts
 * Exit:   0 = clean, 1 = violations found.
 */
import { spawnSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;

/** Every directory that ships client-side UI. Keep in sync with the CI path filters. */
const SRC_DIRS = [
  `${ROOT}packages/ui/src`,
  `${ROOT}packages/shell/src`,
  `${ROOT}packages/jobs/src/client`,
  `${ROOT}apps/web/src/client`,
];

const PALETTE =
  "(gray|slate|zinc|neutral|stone|green|red|blue|yellow|orange|purple|pink|indigo|emerald|amber|rose|teal|cyan|sky|lime)";
const PREFIX = "(text|bg|border|border-t|ring|ring-offset|divide|fill|stroke|from|to|via)";

interface Rule {
  name: string;
  /** ripgrep pattern (Rust regex, or PCRE2 when `pcre2` is set). */
  pattern: string;
  /** Explains the violation and names the fix. */
  message: string;
  /** Absolute paths exempt from this rule (e.g. the layer that defines the thing). */
  allow?: string[];
  /** Restrict the search to these dirs instead of all of SRC_DIRS. */
  dirs?: string[];
  pcre2?: boolean;
}

const RULES: Rule[] = [
  {
    name: "raw-palette-color",
    pattern: `\\b${PREFIX}-${PALETTE}-\\d`,
    message:
      "Raw Tailwind palette color outside the token layer.\n" +
      "   Use a semantic class (text-foreground, text-destructive, bg-muted, …) instead.",
    // The token layer is the only place raw colors may appear.
    allow: [`${ROOT}packages/shell/src/index.css`],
  },
  {
    name: "hand-rolled-card",
    // A *rounded* surface painting both a border and the card background is a
    // Card by any other name. Order-independent via lookaheads. `rounded-` is
    // the discriminator that keeps full-bleed app chrome (e.g. the sidebar
    // panel, which is border-r + bg-card but square) out of the match.
    pattern: "(?=.*\\bbg-card\\b)(?=.*\\brounded-)(?=.*\\bborder\\b).*",
    message:
      "Hand-rolled card surface (rounded + border + bg-card).\n" +
      "   Use <Card> from @groot/ui/card so every surface shares one edge treatment.",
    allow: [`${ROOT}packages/ui/src/card.tsx`],
    pcre2: true,
  },
  {
    name: "raw-table-element",
    pattern: "<(table|thead|tbody)\\b",
    message:
      "Raw table element.\n" +
      "   Use Table/TableHeader/TableBody from @groot/ui/table, or the shared\n" +
      "   tableColumnHeaderClass for grid-based tables.",
    allow: [`${ROOT}packages/ui/src/table.tsx`],
  },
  {
    name: "redundant-icon-margin",
    // Button, DropdownMenuItem, Badge, and Alert all set their own `gap-*`, so a
    // manual margin on a child icon double-spaces it.
    pattern: 'className="[^"]*\\bm[rl]-\\d[^"]*\\b(size-\\d|h-\\d w-\\d)',
    message:
      "Manual margin on an icon inside a gap-spaced component.\n" +
      "   Drop the mr-*/ml-* — Button and DropdownMenuItem already apply a gap.",
    pcre2: true,
  },
  {
    name: "legacy-icon-sizing",
    // Square h-N w-N is icon sizing; rectangular pairs (skeleton bars) are fine.
    // The trailing guard keeps fractional widths like `w-4/6` out of the match.
    pattern: "\\bh-([0-9.]+) w-\\1(?![/\\d])",
    message: "Legacy square icon sizing (h-N w-N).\n" + "   Use the size-N shorthand instead.",
    pcre2: true,
  },
];

function runRule(rule: Rule): { file: string; line: string }[] {
  const args = ["-n", "-g", "*.ts", "-g", "*.tsx", "-g", "*.css"];
  if (rule.pcre2) args.push("--pcre2");
  args.push(rule.pattern, ...(rule.dirs ?? SRC_DIRS));

  const result = spawnSync("rg", args, { encoding: "utf-8" });

  if (result.error) {
    console.error(
      "❌ Design-system check could not run: ripgrep (rg) failed to start — " +
        `${result.error.message}. Install rg before running this check.`,
    );
    process.exit(1);
  }

  const status = result.status;
  if (status === 2) {
    console.error(
      `❌ Design-system check failed: ripgrep reported an error for rule "${rule.name}":\n`,
      result.stderr,
    );
    process.exit(1);
  }
  if (status !== 0 && status !== 1) {
    console.error(
      `❌ Design-system check failed: unexpected ripgrep exit code ${status} for rule "${rule.name}".`,
    );
    process.exit(1);
  }
  // status 1 == no matches for this rule.
  if (status !== 0 || !result.stdout.trim()) return [];

  return result.stdout
    .trim()
    .split("\n")
    .map((line) => {
      const [file, ...rest] = line.split(":");
      return { file, line: rest.join(":").trim() };
    })
    .filter(({ file }) => !rule.allow?.includes(file));
}

let failed = false;

for (const rule of RULES) {
  const violations = runRule(rule);
  if (violations.length === 0) continue;

  failed = true;
  console.error(`\n❌ ${rule.name}: ${rule.message}\n`);
  for (const v of violations) {
    console.error(`   ${v.file}: ${v.line}`);
  }
}

if (failed) {
  console.error("\nSee docs/features/client.md for the UI system rules these checks enforce.\n");
  process.exit(1);
}

console.log(`✓ Design system clean (${RULES.length} rules, ${SRC_DIRS.length} source dirs).`);
process.exit(0);
