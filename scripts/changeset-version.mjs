/**
 * Retry wrapper around `changeset version`.
 *
 * Why this exists:
 *   `@changesets/changelog-github` (configured in .changeset/config.json) enriches
 *   changelog entries by calling the GitHub GraphQL API via
 *   `@changesets/get-github-info`. That package does a single `fetch` with NO
 *   retry, and its `response.json()` throws "Failed to parse data from GitHub
 *   / Premature close" whenever the TCP connection is severed mid-body. On
 *   GitHub Actions runners this happens often enough to make every
 *   "chore: version packages" release unreliable.
 *
 *   This wrapper retries the version command a few times so a transient
 *   network truncation doesn't block releases. If it still fails after all
 *   attempts, we exit non-zero so the failure stays visible.
 *
 * Used by .github/workflows/release.yml via:
 *   version: node scripts/changeset-version.mjs
 */
import { execFileSync } from "node:child_process";
import process from "node:process";

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 5000;

const run = () => {
  // Hand off to the real changeset CLI via the pnpm script so it resolves the
  // same binary the project pins. execFileSync throws on non-zero exit.
  execFileSync("pnpm", ["changeset", "version"], { stdio: "inherit" });
};

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    run();
    process.exit(0);
  } catch {
    if (attempt === MAX_ATTEMPTS) {
      console.error(
        `\nchangeset version failed after ${MAX_ATTEMPTS} attempts. ` +
          `Last failure shown above. If this persists, the GitHub GraphQL call ` +
          `in @changesets/changelog-github may be blocked — consider switching ` +
          `.changeset/config.json to "@changesets/changelog" as a fallback.`,
      );
      process.exit(1);
    }
    console.warn(
      `\nchangeset version failed (attempt ${attempt}/${MAX_ATTEMPTS}). ` +
        `Retrying in ${BACKOFF_MS / 1000}s… (usually a transient GitHub API truncation)`,
    );
    await new Promise((r) => setTimeout(r, BACKOFF_MS));
  }
}
