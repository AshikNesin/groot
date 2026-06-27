/**
 * Resilient changesets changelog wrapper.
 *
 * Wraps @changesets/changelog-github with graceful degradation:
 *
 *   - When the GitHub GraphQL API is reachable: full enrichment (commit/PR
 *     links, author attribution) — identical output to changelog-github.
 *   - When GraphQL fails (e.g. undici "Premature close" on CI runners):
 *     plain entries with just the commit SHA and summary, so releases are
 *     NEVER blocked by a transient or sustained API outage.
 *
 * Configured in .changeset/config.json:
 *   "changelog": ["./scripts/changelog.cjs", { "repo": "AshikNesin/groot" }]
 *
 * This replaces both the previous retry-wrapper approach and the need for
 * @changesets/changelog-github to be specified directly in config.
 */
const githubChangelog = require("@changesets/changelog-github").default;

/**
 * Format a plain (un-enriched) release line.
 * Produces: `- \`abc1234\` Summary text`
 * (or just `- Summary text` if no commit is available).
 */
function plainReleaseLine(changeset) {
  const firstLine = (changeset.summary || "").split("\n")[0].trim();
  const sha = changeset.commit ? `\`${changeset.commit.slice(0, 7)}\` ` : "";
  return `- ${sha}${firstLine}`;
}

async function getReleaseLine(changeset, type, options) {
  try {
    return await githubChangelog.getReleaseLine(changeset, type, options);
  } catch (err) {
    const reason = err?.message?.split("\n")[0] || "unknown error";
    console.warn(
      `[changelog] GitHub enrichment failed (${reason}). ` +
        `Falling back to plain formatting for this entry.`,
    );
    return plainReleaseLine(changeset);
  }
}

async function getDependencyReleaseLine(changesets, type, options) {
  try {
    return await githubChangelog.getDependencyReleaseLine(changesets, type, options);
  } catch {
    // Dependency bumps are minor metadata; empty is fine if enrichment fails.
    return "";
  }
}

module.exports = { getReleaseLine, getDependencyReleaseLine };
