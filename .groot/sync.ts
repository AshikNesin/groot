#!/usr/bin/env tsx
/**
 * Groot Sync v5 - Snapshot-based, self-healing boilerplate sync
 *
 * Thin CLI over the engine in `lib/engine.ts`. Every run reconciles the full
 * set of synced files against the baseline snapshot (`refs/groot/baseline`)
 * and the boilerplate HEAD, so sync is idempotent and recovers from lost
 * state, crashed runs, and upstream history rewrites. Files that genuinely
 * conflict are written with conflict markers and recorded in
 * `.groot/needs-review/manifest.json` for the AI-assisted resolver
 * (`pnpm groot:resolve`).
 *
 * Usage:
 *   pnpm groot:check            - Check for available changes (dry run)
 *   pnpm groot:sync             - Apply safe changes + write conflict markers
 *   pnpm groot:sync --skip-conflicts
 *                               - Apply only clean changes (CI), record
 *                                 conflicts in the manifest without writing
 *                                 markers into the working tree
 *   pnpm groot:sync --force     - Overwrite files even when they have
 *                                 uncommitted git changes
 */
import { runSync, type SyncResult } from "./lib/engine";

function printSection(title: string, files: string[]): void {
  if (files.length === 0) return;
  console.log(`### ${title} (${files.length})`);
  files.forEach((f) => console.log(`  ${f}`));
  console.log();
}

function printResult(result: SyncResult, command: "check" | "apply"): void {
  console.log(`\n## Results\n`);
  if (result.fromVersion || result.toVersion) {
    const from = result.fromVersion ? `v${result.fromVersion}` : result.fromCommit.slice(0, 7);
    const to = result.toVersion ? `v${result.toVersion}` : result.toCommit.slice(0, 7);
    console.log(`Version: ${from} → ${to}`);
  } else {
    console.log(`From: ${result.fromCommit.slice(0, 7)}`);
    console.log(`To:   ${result.toCommit.slice(0, 7)}`);
  }
  console.log();

  if (result.changelog.length > 0) {
    console.log("### Changelog");
    result.changelog.forEach((line) => console.log(`  ${line}`));
    console.log();
  }

  if (result.breakingChanges.length > 0) {
    console.log("### ⚠ Breaking Changes");
    result.breakingChanges.forEach((line) => console.log(`  ${line}`));
    console.log();
  }

  printSection(
    "Auto-Apply — clean",
    result.autoApply.map((f) => f.file),
  );
  printSection(
    "Auto-Merged — 3-way",
    result.autoMerged.map((f) => f.file),
  );

  if (result.conflicts.length > 0) {
    console.log(`### Conflicts — needs resolution (${result.conflicts.length})`);
    result.conflicts.forEach((c) => {
      const hunks = `${c.conflicts} conflict${c.conflicts === 1 ? "" : "s"}`;
      console.log(`  ${c.file} (${hunks})`);
    });
    console.log();
  }

  printSection("Binary Conflicts — reconcile manually", result.binaryConflicts);
  printSection("Deleted — removed upstream, unmodified locally", result.deleted);
  printSection("Deletion Review — removed upstream but modified locally", result.reviewDeletions);
  printSection("Kept Local Deletions — deleted locally, still upstream", result.keptLocalDeletions);
  printSection("Drift — new in groot, not synced", result.drift);

  const immCount = result.skipped.immutable.length;
  const appCount = result.skipped.appSpecific.length;
  if (immCount + appCount > 0) {
    console.log(`### Skipped — immutable: ${immCount}, app-specific: ${appCount}`);
    console.log();
  }

  console.log(`### Summary`);
  console.log(`  - Auto-apply:    ${result.autoApply.length}`);
  console.log(`  - Auto-merged:   ${result.autoMerged.length}`);
  console.log(`  - Conflicts:     ${result.conflicts.length + result.binaryConflicts.length}`);
  console.log(`  - Deleted:       ${result.deleted.length}`);
  console.log(`  - Needs review:  ${result.reviewDeletions.length} deletion(s)`);
  console.log(`  - Drift:         ${result.drift.length}`);
  console.log(`  - Skipped:       ${immCount + appCount} (immutable ${immCount}, app ${appCount})`);

  const applicable =
    result.autoApply.length +
    result.autoMerged.length +
    result.conflicts.length +
    result.deleted.length;

  if (command === "check") {
    if (applicable > 0) {
      console.log(`\n→ Run 'pnpm groot:sync' to apply ${applicable} change(s).`);
    } else {
      console.log(`\n✓ Already in sync.`);
    }
  } else {
    const applied = result.autoApply.length + result.autoMerged.length + result.deleted.length;
    if (applied > 0) console.log(`\n✓ Applied ${applied} change(s).`);
  }

  if (result.conflicts.length > 0) {
    console.log(
      `\n⚠ ${result.conflicts.length} file(s) have conflicts. ` +
        `Run 'pnpm groot:resolve' to resolve them with the pi coding agent.`,
    );
  }

  console.log(`\n📄 Sync report written to .groot/sync-report.json`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] as "check" | "apply";
  const skipConflicts = args.includes("--skip-conflicts");
  const force = args.includes("--force");

  if (!["check", "apply"].includes(command)) {
    console.error("Usage: tsx sync.ts [check|apply] [--skip-conflicts] [--force]");
    console.error("");
    console.error("Commands:");
    console.error("  check  - Check for available changes (dry run)");
    console.error("  apply  - Apply safe changes, write conflict markers, update baseline");
    console.error("");
    console.error("Options:");
    console.error("  --skip-conflicts  - Don't write conflict markers (CI); only record them");
    console.error("  --force           - Overwrite files with uncommitted git changes");
    process.exit(1);
  }

  console.log("\n## Groot Sync v5\n");
  console.log(`Mode: ${command === "check" ? "dry run" : "apply"}\n`);

  const result = await runSync(process.cwd(), { mode: command, skipConflicts, force });
  printResult(result, command);
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
