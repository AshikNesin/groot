---
title: "feat: Add YAML-based configuration system"
type: feat
status: active
date: 2026-04-12
---

# feat: Add YAML-based configuration system (Dynaconf-inspired)

## Overview

Introduce a `config.yml`-based configuration system inspired by [Dynaconf](https://www.dynaconf.com) to replace the growing number of non-secret environment variables. The system provides environment-aware layered config (default, development, production, test), dynamic variable interpolation (`${VAR}`, `${VAR:-fallback}`), full TypeScript typing via Zod, and a developer experience as simple as the existing `core/env` module.

**Scope:** Complements varlock (secrets stay in env vars). KV-backed runtime settings remain unchanged for admin-configurable values.

## Problem Statement / Motivation

The app has **36 env vars** in `.env.schema`, growing with every feature. Most are not secrets — they're feature flags, behavioral toggles, default values, and per-environment settings. Problems:

1. **Maintenance burden** — every new config value requires editing `.env.schema`, regenerating types, and updating deployment environments
2. **No environment grouping** — all env vars are flat; no way to see "what does the AI feature need?" at a glance
3. **No per-environment overrides** — `NODE_ENV` branching is scattered across 7+ files with `env.NODE_ENV === "production"` checks
4. **No feature flag semantics** — boolean toggles are just strings in env vars with `=== "true"` comparisons
5. **Undocumented vars** — `PUSHOVER_*`, `VITE_HMR_URL`, `PORTLESS_URL` are used but not in `.env.schema`

## Proposed Solution

A `config.yml` file at project root with environment sections, loaded at startup with deep merging, dynamic interpolation, and Zod validation:

```yaml
# config.yml
default:
  app:
    name: "Groot"
    isProduction: false
  cors:
    origins: ["http://localhost:3000"]
  jobs:
    enabled: true
    concurrency: 5
    pollInterval: 2000
  ai:
    defaultProvider: "openai"
    defaultModel: "gpt-4o-mini"
    enableStreaming: true
    trackUsage: true
  logging:
    level: "info"
    format: "json"
  features:
    enableNotifications: false

development:
  logging:
    level: "debug"
    format: "text"

production:
  app:
    isProduction: true
  cors:
    origins: ["${CORS_ALLOWED_ORIGINS}"]
  jobs:
    concurrency: 10
  logging:
    level: "warn"

test:
  logging:
    level: "silent"
  jobs:
    enabled: false
```

### Developer experience

```typescript
import { config } from "@/core/config";

config.app.name; // "Groot" — full autocomplete
config.ai.defaultProvider; // "openai"
config.features.enableNotifications; // false
config.app.isProduction; // false in development, true in production
```

Same simplicity as `import { env } from "@/core/env"`.

## Technical Considerations

### Initialization order

The config module **must** import from `@/core/env` to ensure varlock initializes first (needed for `NODE_ENV` and `process.env` population):

```
core/env.ts (varlock auto-load)  →  core/config/index.ts (reads config.yml)
```

Config loads **synchronously** at import time (like the current env module). This avoids timing issues with module-scope consumers.

### Precedence hierarchy (highest wins)

1. **Environment variables** — values like `${OPENAI_API_KEY}` resolved from `process.env`
2. **`config.local.yml`** — gitignored, personal developer overrides (same structure with env sections)
3. **`config.yml` environment section** — `development:`, `production:`, `test:`
4. **`config.yml` default section** — `default:`
5. **Zod schema defaults** — `.default()` values in the Zod schema

### Deep merge semantics

- **Objects**: recursive merge (production only needs to override what differs)
- **Arrays**: replacement (not concatenation — matches Dynaconf behavior)
- **`null`**: removes a key from defaults

```yaml
default:
  cors:
    origins: ["http://localhost:3000"]
    methods: ["GET", "POST", "PUT", "DELETE"]
production:
  cors:
    origins: ["https://example.com"]
# Result: cors.origins = ["https://example.com"], cors.methods preserved from default
```

### Dynamic variable interpolation

| Syntax             | Meaning                         | Example                                         |
| ------------------ | ------------------------------- | ----------------------------------------------- |
| `${VAR}`           | Env var reference (required)    | `${JWT_SECRET}` — startup fails if missing      |
| `${VAR:-fallback}` | Env var with fallback           | `${OPENAI_API_KEY:-}` — empty string if missing |
| `${VAR:-3000}`     | Env var with non-empty fallback | `${PORT:-3000}`                                 |

Missing required `${VAR}` (no `:-` fallback) on a non-optional Zod field → startup aborts with clear error.

**Self-references** (e.g., `${config.app.name}`) are **deferred to Phase 2**. They add significant complexity (cycle detection, resolution ordering) with minimal MVP value.

### Validation strategy

- Use `z.coerce` for primitives — forgiving of YAML quoting issues (`"3000"` → `3000`)
- Validation errors formatted for terminal (not JSON API response style) — clear key path, expected type, actual value
- Unknown keys in config.yml → warning (not error) to allow forward-compatible configs

### Secret prevention

- Document that secrets must use `${VAR}` references, never literal values
- Gitleaks pre-commit hook (already installed) scans config.yml
- Config.yml is committed to git (unlike `.env`) — only non-secret values

## System-Wide Impact

- **Interaction graph**: Config module is imported early in the dependency chain. All files currently importing `@/core/env` for non-secret values will gradually migrate to `@/core/config`.
- **Error propagation**: Config validation errors abort startup with a descriptive terminal message (file path, key path, expected vs actual). No silent failures.
- **State lifecycle**: Config is frozen after load. No runtime mutations. Feature flag changes require restart.
- **API surface parity**: Both `env` (varlock) and `config` (new) coexist during migration. New values go to config.yml.
- **Integration test scenarios**:
  - Fresh clone without config.yml → clear error message with instructions
  - config.yml with invalid YAML → parse error with line number
  - Missing required env var reference → startup abort naming the key
  - Unknown NODE_ENV → falls back to `default` section only

## Acceptance Criteria

### Core System

- [x] `config.yml` loads and parses at startup with environment sections
- [x] Deep merge: `default` ← active environment section ← `config.local.yml`
- [x] Dynamic interpolation: `${VAR}` and `${VAR:-fallback}` resolve from `process.env`
- [x] Zod schema validates merged config with `z.coerce` for primitives
- [x] TypeScript types auto-derived from Zod schema (`z.infer`)
- [x] `import { config } from "@/core/config"` provides typed, frozen config object
- [x] Startup aborts with clear error on invalid/missing config
- [x] `config.example.yml` committed as template
- [x] `config.local.yml` added to `.gitignore`
- [x] `js-yaml` added as dependency

### Integration

- [x] Config module imports from `@/core/env` to ensure varlock loads first
- [x] Module-scope consumers can safely access config (synchronous load)
- [x] Test environment loads `test:` section from config.yml
- [x] Existing `@/core/env` imports continue working unchanged

### Config Boundary

- [x] Clear guideline documented: config.yml = deployment-time / environment-level; KV settings = runtime / admin-configurable
- [x] Secrets (JWT_SECRET, API keys, S3 credentials) remain in env vars, referenced via `${VAR}`

## Success Metrics

- Adding a new config value requires editing only `config.yml` + `config.schema.ts` (2 files)
- All non-secret env vars that are behavior/feature toggles can live in config.yml
- Full TypeScript autocomplete on `config.*` with zero `as any` casts
- No regression in startup time (YAML parse + validate < 50ms)

## Dependencies & Risks

**Dependencies:**

- `js-yaml` package (MIT, well-maintained, 40M+ weekly downloads)

**Risks:**

| Risk                                             | Mitigation                                          |
| ------------------------------------------------ | --------------------------------------------------- |
| Secrets accidentally committed to config.yml     | Gitleaks hook + documentation                       |
| Circular import between core/env and core/config | Config imports env, never the reverse               |
| YAML parse errors confusing to developers        | Wrap with friendly error messages (file path, line) |
| Migration breaks existing functionality          | Gradual migration — both systems coexist            |
| config.yml missing on fresh clone                | `config.example.yml` + clear error message          |

## MVP

### File structure

```
server/src/core/config/
├── index.ts           # Public API: config singleton export
├── config.loader.ts   # YAML parse, merge, interpolation, validate
├── config.schema.ts   # Zod schema (source of truth for types)
└── config.merge.ts    # Deep merge utility

config.yml             # Committed — default + env sections
config.example.yml     # Committed — template with comments
config.local.yml       # Gitignored — personal overrides
```

### config.schema.ts

```typescript
import { z } from "zod";

export const configSchema = z.object({
  app: z.object({
    name: z.coerce.string().default("Groot"),
    isProduction: z.coerce.boolean().default(false),
  }),
  cors: z.object({
    origins: z.array(z.coerce.string()).default([]),
  }),
  jobs: z.object({
    enabled: z.coerce.boolean().default(true),
    concurrency: z.coerce.number().int().min(1).default(5),
    pollInterval: z.coerce.number().int().min(500).default(2000),
    archiveCompletedAfterSeconds: z.coerce.number().int().min(0).default(3600),
    deleteArchivedAfterSeconds: z.coerce.number().int().min(0).default(86400),
    monitorStateInterval: z.coerce.number().int().min(0).default(60000),
  }),
  ai: z.object({
    defaultProvider: z.coerce.string().default("openai"),
    defaultModel: z.coerce.string().default("gpt-4o-mini"),
    enableStreaming: z.coerce.boolean().default(true),
    trackUsage: z.coerce.boolean().default(true),
  }),
  logging: z.object({
    level: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
    format: z.enum(["json", "text"]).default("json"),
  }),
  features: z.object({
    enableNotifications: z.coerce.boolean().default(false),
  }),
});

export type Config = z.infer<typeof configSchema>;
```

### config.loader.ts

```typescript
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "js-yaml";
import { env } from "@/core/env";
import { configSchema, type Config } from "./config.schema";
import { deepMerge } from "./config.merge";

const CONFIG_PATH = resolve(process.cwd(), "config.yml");
const LOCAL_CONFIG_PATH = resolve(process.cwd(), "config.local.yml");

let _config: Config | null = null;

export function loadConfig(): Config {
  if (_config) return _config;

  if (!existsSync(CONFIG_PATH)) {
    throw new Error(
      `config.yml not found at ${CONFIG_PATH}\nCopy config.example.yml to config.yml to get started.`,
    );
  }

  // 1. Parse config.yml
  const raw = parseYaml(readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown>;

  // 2. Deep merge: default ← active environment section
  const defaults = (raw.default ?? {}) as Record<string, unknown>;
  const envSection = (raw[env.NODE_ENV] ?? {}) as Record<string, unknown>;
  let merged = deepMerge(defaults, envSection);

  // 3. Layer config.local.yml if it exists
  if (existsSync(LOCAL_CONFIG_PATH)) {
    const localRaw = parseYaml(readFileSync(LOCAL_CONFIG_PATH, "utf-8")) as Record<string, unknown>;
    const localDefaults = (localRaw.default ?? {}) as Record<string, unknown>;
    const localEnv = (localRaw[env.NODE_ENV] ?? {}) as Record<string, unknown>;
    const localMerged = deepMerge(localDefaults, localEnv);
    merged = deepMerge(merged, localMerged);
  }

  // 4. Resolve dynamic variables (${VAR}, ${VAR:-fallback})
  const resolved = resolveVariables(merged);

  // 5. Validate with Zod
  _config = configSchema.parse(resolved);
  return _config;
}

export function reloadConfig(): Config {
  _config = null;
  return loadConfig();
}
```

### config.merge.ts

```typescript
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = result[key];
    if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else {
      result[key] = sourceVal; // arrays replace, primitives replace, null deletes
    }
  }
  return result;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}
```

### index.ts

```typescript
import { loadConfig, reloadConfig } from "./config.loader";
import type { Config } from "./config.schema";

export type { Config };
export { reloadConfig };

// Eager singleton — loaded on first import, same DX as core/env
export const config: Config = loadConfig();
```

### Variable resolver (inside config.loader.ts)

```typescript
function resolveVariables(value: unknown): unknown {
  if (typeof value === "string") {
    return resolveString(value);
  }
  if (Array.isArray(value)) {
    return value.map(resolveVariables);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = resolveVariables(v);
    }
    return result;
  }
  return value;
}

function resolveString(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, expr: string) => {
    const [varName, fallback] = expr.split(":-");
    const envVal = process.env[varName.trim()];
    if (envVal !== undefined) return envVal;
    if (fallback !== undefined) return fallback.trim();
    // No fallback — return empty string; Zod validation will catch if required
    return "";
  });
}
```

## Migration Strategy

### Phase 1: Coexistence (this plan)

1. Add `config.yml` + `config.example.yml` + core config module
2. Migrate **new** config values to config.yml going forward
3. Existing env vars in `.env.schema` stay untouched
4. Replace scattered `env.NODE_ENV === "production"` with `config.app.isProduction`

### Phase 2: Gradual migration (future)

1. Move non-secret env vars from `.env.schema` to `config.yml` (feature flags, toggles, defaults)
2. Update consumers to import from `@/core/config` instead of `@/core/env`
3. Add self-reference support (`${config.path.to.key}`)
4. Generate JSON Schema from Zod for YAML autocompletion

**Decision framework — what goes where:**

| Location               | Use for                                               | Examples                                                         |
| ---------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| **Env vars** (varlock) | Secrets, infrastructure, deployment-specific          | JWT_SECRET, DATABASE_URL, S3 credentials, API keys               |
| **config.yml**         | App behavior, feature flags, per-environment settings | log levels, CORS origins, job concurrency, AI defaults           |
| **KV settings**        | Runtime admin-configurable values                     | Feature toggles that change without restart, per-tenant settings |

## Sources & References

- [Dynaconf documentation](https://www.dynaconf.com) — inspiration for multi-environment config pattern
- [Dynaconf dynamic variables](https://www.dynaconf.com/dynamic/) — `@env` and `@format` patterns adapted to `${VAR}` syntax
- `server/src/core/env.ts` — existing env module (3 lines, varlock delegation)
- `server/src/core/job/config.ts` — existing frozen config object pattern
- `.env.schema` — current 36 env var definitions
- `server/src/shared/settings/` — KV-backed runtime settings (remains unchanged)
