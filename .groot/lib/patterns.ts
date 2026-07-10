/**
 * Single source of truth for what syncs between groot and child repos.
 *
 * Shared by `sync.ts`, `resolve.ts`, and `upstream.ts` so the pattern lists
 * can never drift apart between tools again.
 */
import { normalize } from "node:path";
import micromatch from "micromatch";

// ============================================================
// IMMUTABLE EXCLUSIONS - Cannot be overridden by config
// Security-critical files that must NEVER be synced/upstreamed
// ============================================================

export const IMMUTABLE_EXCLUSIONS: readonly string[] = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.*.local",
  "apps/web/prisma/schema.prisma",
  "apps/web/prisma/migrations/**",
  "node_modules/**",
  "dist/**",
  ".git/**",
  "*.pem",
  "*.key",
  "secrets/**",

  // Generated Prisma client output (regenerated per-project).
  "packages/database/generated/**",

  // Sync tooling state — must NEVER be overwritten with the boilerplate's
  // own values (would corrupt this project's last_sync baseline).
  // Project-only docs live here too and must not be clobbered by the
  // boilerplate's copies.
  ".groot/boilerplate-sync.json",
  ".groot/sync-report.json",
  ".groot/feature-request.md",
  ".groot/repo-drift.md",

  // Conflict-resolution working state (manifest + any scratch files). This is
  // generated per-project and must never be pulled from the boilerplate.
  ".groot/needs-review/**",
] as const;

// ============================================================
// SYNC PATTERNS - Files that should be synced (and upstreamed)
// ============================================================

export const SYNC_PATTERNS: readonly string[] = [
  // All workspace packages are boilerplate (ui, client, server, database).
  // Child repos get the full packages/ tree; business logic lives in apps/.
  "packages/**",

  // Workspace package manifests per package.
  "apps/*/package.json",
  "apps/*/tsconfig.json",
  "apps/*/index.html",

  // Tests mirroring synced source (core/shared/ui infra + shared test setup).
  // App-specific and e2e tests stay project-local.
  "tests/server/core/**",
  "tests/server/shared/**",
  "tests/server/groot/**",
  "tests/server/setup.ts",
  "tests/client/setup.ts",
  "tests/client/components/ui/**",

  // Infrastructure
  "*.config.*",
  "tsconfig.json",
  "tsconfig.base.json",
  ".github/workflows/**",
  ".vite-hooks/**",
  ".gitleaks.toml",
  "scripts/**",
  "postcss.config.js",
  "components.json",

  // Sync tooling — keep the sync tool itself up to date.
  // State files (boilerplate-sync.json, sync-report.json) and project-only
  // docs (feature-request.md, repo-drift.md) are guarded by
  // IMMUTABLE_EXCLUSIONS so only the tool's _code_ syncs.
  ".groot/**",

  // Agent skills shipped with the boilerplate.
  ".agents/skills/**",

  // Documentation
  "docs/**",

  // Environment template (not actual secrets)
  ".env.schema",
] as const;

// ============================================================
// SKIP PATTERNS - App-specific code to never sync/upstream
// ============================================================

export const SKIP_PATTERNS: readonly string[] = [
  // App-owned source code (never synced).
  // Business modules, route registration, server/client entry points.
  "apps/web/src/**",

  // Project-local tests (app routes, end-to-end).
  "tests/server/app/**",
  "tests/server/routes/**",
  "tests/e2e/**",

  // Other (project-owned docs and lockfile)
  "README.md",
  "pnpm-lock.yaml",
] as const;

// Files that don't match a sync pattern by glob but should still flow through
// the three-way merge path (their content genuinely belongs to both repos).
export const FORCE_MERGE_FILES: readonly string[] = [
  ".gitignore",
  "package.json",
  "pnpm-workspace.yaml",
] as const;

// ============================================================
// PATH VALIDATION - Security against traversal attacks
// ============================================================

const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /\.\./, // Path traversal
  /~/, // Home directory
  /\\0/, // Null byte (escaped for lint)
  /^\//, // Absolute path
  /\$\(/, // Command substitution
  /`/, // Backtick
] as const;

export function validateFilePath(filePath: string): { valid: boolean; reason?: string } {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(filePath)) {
      return { valid: false, reason: "Forbidden pattern detected" };
    }
  }

  const normalized = normalize(filePath);
  if (normalized.startsWith("..") || normalized.startsWith("/")) {
    return { valid: false, reason: "Path traversal attempt" };
  }

  return { valid: true };
}

// ============================================================
// CATEGORIZATION - Where does a changed file belong?
// ============================================================

export type Action = "sync" | "skip-immutable" | "skip-app" | "drift";

export function categorizeFile(
  filePath: string,
  additionalExclusions: string[],
): { action: Action } {
  // 1. Immutable exclusions first (security)
  if (micromatch.isMatch(filePath, IMMUTABLE_EXCLUSIONS as string[])) {
    return { action: "skip-immutable" };
  }

  // 2. App-specific skip patterns (incl. project-local exclusions)
  const allSkipPatterns = [...SKIP_PATTERNS, ...additionalExclusions];
  if (micromatch.isMatch(filePath, allSkipPatterns)) {
    return { action: "skip-app" };
  }

  // 3. Files that always merge (content shared by both repos)
  if (FORCE_MERGE_FILES.includes(filePath)) {
    return { action: "sync" };
  }

  // 4. Sync patterns
  if (micromatch.isMatch(filePath, SYNC_PATTERNS as string[])) {
    return { action: "sync" };
  }

  // 5. Changed in groot, matches no sync pattern → drift (new boilerplate
  //    surface the project may want to adopt manually).
  return { action: "drift" };
}
