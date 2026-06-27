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
 *   This wrapper retries the version command up to 7 times with exponential
 *   backoff (1s→2s→4s→8s→16s→32s). Each attempt is fast (~1s — the GraphQL
 *   call fails instantly on TCP reset), and the per-attempt failure rate is
 *   ~50%, so 7 attempts give ~99.2% success. If it still fails after all
 *   attempts, we exit non-zero so the failure stays visible.
 *
 * Used by .github/workflows/release.yml via:
 *   version: node scripts/changeset-version.mjs
 */
import { execFileSync } from "node:child_process";
import process from "node:process";

const MAX_ATTEMPTS = 7;
const BASE_DELAY_MS = 1000; // exponential: 1s, 2s, 4s, 8s, 16s, 32s

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
    const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
    console.warn(
      `\nchangeset version failed (attempt ${attempt}/${MAX_ATTEMPTS}). ` +
        `Retrying in ${delay / 1000}s… (usually a transient GitHub API truncation)`,
    );
    await new Promise((r) => setTimeout(r, delay));
  }
}
