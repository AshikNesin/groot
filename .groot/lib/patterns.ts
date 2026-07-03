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
  "prisma/schema.prisma",
  "prisma/migrations/**",
  "node_modules/**",
  "dist/**",
  ".git/**",
  "*.pem",
  "*.key",
  "secrets/**",

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
  // UI Components (design system primitives). See AGENTS.md "Frontend Layering".
  "client/src/ui/**",
  "client/src/index.css",

  // Client Core (boilerplate infrastructure: layouts, api client, stores,
  // hooks, lib, types, services). Mirrors server/src/core on the client.
  "client/src/core/**",

  // Server Core (drop-in infrastructure)
  "server/src/core/**",
  "server/src/test-helpers.ts",

  // Server Shared (reusable features: auth, storage, etc.)
  "server/src/shared/**",

  // Tests mirroring synced source (core/shared infra + ui primitives +
  // shared test setup). App-specific and e2e tests stay project-local.
  "tests/server/core/**",
  "tests/server/shared/**",
  "tests/server/groot/**",
  "tests/server/setup.ts",
  "tests/client/setup.ts",
  "tests/client/components/ui/**",

  // Infrastructure
  "*.config.*",
  "tsconfig.json",
  ".github/workflows/**",
  ".vite-hooks/**",
  ".gitleaks.toml",
  "scripts/**",

  // Sync tooling — keep the sync tool itself up to date.
  // State files (boilerplate-sync.json, sync-report.json) and project-only
  // docs (feature-request.md, repo-drift.md) are guarded by
  // IMMUTABLE_EXCLUSIONS so only the tool's _code_ syncs.
  ".groot/**",

  // Agent skills shipped with the boilerplate (groot-sync, node, grill-me,
  // improve-codebase-architecture). Child repos can opt out of specific
  // skills via additional_exclusions if they keep their own.
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
  // App-specific server code (never sync)
  "server/src/app/**",
  "server/src/routes.ts",
  "server/src/index.ts",

  // App-specific client code (never sync). The frontend app/ layer holds
  // project features; ui/ and core/ are synced (see SYNC_PATTERNS).
  "client/src/app/**",

  // Project-local tests (app routes, end-to-end). Core/shared/ui tests are
  // synced; these stay project-specific.
  "tests/server/app/**",
  "tests/server/routes/**",
  "tests/e2e/**",

  // Other (project-owned docs and lockfile)
  "README.md",
  "pnpm-lock.yaml",
] as const;

// Files that don't match a sync pattern by glob but should still flow through
// the three-way merge path (their content genuinely belongs to both repos).
export const FORCE_MERGE_FILES: readonly string[] = [".gitignore", "package.json"] as const;

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
