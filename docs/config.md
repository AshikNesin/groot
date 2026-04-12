# Config System (config.yml)

Application settings live in `config.yml` — a YAML file at the project root. It replaces environment variables for non-secret configuration (feature flags, timeouts, provider defaults, etc.) while keeping secrets in `.env`.

## Quick Start

1. Copy the example file:

   ```bash
   cp config.example.yml config.yml
   ```

2. Edit `config.yml` for your environment.

3. Access config in code:

   ```typescript
   import { config } from "@/core/config";

   config.app.name; // "Groot"
   config.ai.defaultProvider; // "anthropic"
   config.logging.level; // "info"
   ```

The config is loaded eagerly on first import, validated with Zod, and deep-frozen — any mutation throws at runtime.

## Structure

The file is split into environment sections. The `default` section is the base, and the section matching `NODE_ENV` (e.g., `development`, `production`, `test`) is deep-merged on top:

```yaml
default:
  logging:
    level: "info"

development:
  logging:
    level: "debug"

production:
  logging:
    level: "warn"
```

Running with `NODE_ENV=production` merges `default` + `production`, resulting in `logging.level: "warn"`.

### Merge Rules

- **Objects** merge recursively — nested keys override individually.
- **Arrays** replace entirely — they do not concatenate.
- **Scalars** override directly.

```yaml
default:
  cors:
    origins:
      - "http://localhost:3000"

production:
  cors:
    origins:
      - "https://example.com"
```

In production, `cors.origins` is `["https://example.com"]` (replaced), not a concatenation of both arrays.

## Environment Variables

Use `{{ env.VARIABLE_NAME }}` to inject an env var into a config value:

```yaml
production:
  cors:
    origins:
      - "{{ env.CORS_ALLOWED_ORIGINS }}"
```

If the env var is not set, the server throws a startup error with a clear message telling you which variable is missing.

**Secrets stay in `.env`** — never put API keys, JWT secrets, or credentials directly in `config.yml`. Reference them via `{{ env.VAR }}` when needed, or let the code read them from `env` directly (which is the typical pattern for secrets like `JWT_SECRET`).

## Local Overrides

Create `config.local.yml` (git-ignored) for machine-specific overrides. It follows the same structure and merges on top of `config.yml`:

```yaml
# config.local.yml
default:
  logging:
    level: "trace"
```

This is useful for debugging without modifying the shared config.

## Available Settings

| Path                                | Type       | Default                     | Description                                           |
| ----------------------------------- | ---------- | --------------------------- | ----------------------------------------------------- |
| `app.name`                          | `string`   | `"Groot"`                   | Application name                                      |
| `app.isProduction`                  | `boolean`  | `false`                     | Production mode flag                                  |
| `app.port`                          | `number`   | `3000`                      | HTTP port                                             |
| `cors.origins`                      | `string[]` | `[]`                        | Allowed CORS origins                                  |
| `auth.jwtExpiresIn`                 | `string`   | `"30d"`                     | JWT token expiration                                  |
| `jobs.enabled`                      | `boolean`  | `true`                      | Enable background job processing                      |
| `jobs.concurrency`                  | `number`   | `5`                         | Worker concurrency                                    |
| `jobs.pollIntervalSeconds`          | `number`   | `5`                         | Worker poll interval                                  |
| `jobs.archiveCompletedAfterSeconds` | `number`   | `604800`                    | Archive completed jobs after (7 days)                 |
| `jobs.deleteArchivedAfterSeconds`   | `number`   | `2592000`                   | Delete archived jobs after (30 days)                  |
| `jobs.monitorStateIntervalSeconds`  | `number`   | `60`                        | Queue state monitor interval                          |
| `ai.defaultProvider`                | `string`   | `"anthropic"`               | Default LLM provider                                  |
| `ai.defaultModel`                   | `string`   | `"claude-sonnet-4-6"`       | Default model name                                    |
| `ai.enableStreaming`                | `boolean`  | `true`                      | Enable streaming responses                            |
| `ai.trackUsage`                     | `boolean`  | `true`                      | Track AI token usage                                  |
| `logging.level`                     | `enum`     | `"info"`                    | Log level: `debug`, `info`, `warn`, `error`, `silent` |
| `logging.format`                    | `enum`     | `"json"`                    | Log format: `json`, `text`                            |
| `passkey.rpName`                    | `string`   | `"Groot"`                   | WebAuthn relying party name                           |
| `passkey.rpId`                      | `string`   | `"localhost"`               | WebAuthn relying party ID                             |
| `passkey.origin`                    | `string`   | `"https://groot.localhost"` | WebAuthn origin                                       |
| `sentry.dsn`                        | `string`   | `""`                        | Sentry DSN for error tracking                         |
| `features.enableNotifications`      | `boolean`  | `false`                     | Enable notifications                                  |

## Validation

The Zod schema (`server/src/core/config/config.schema.ts`) validates the merged config at startup. Invalid values throw a `Boom.internal` error with the exact path and message:

```
Invalid config.yml:
  config.logging.level — Invalid enum value. Expected 'debug' | 'info' | 'warn' | 'error' | 'silent'
```

Missing optional fields fall back to their Zod defaults — you only need to specify what you want to override.

## Architecture

```
config.yml
  config.local.yml (optional)
    ↓ parse YAML
    ↓ merge default + current NODE_ENV section
    ↓ layer config.local.yml on top
    ↓ resolve {{ env.VAR }} references
    ↓ validate with Zod schema
    ↓ deep freeze
  config singleton (typed, immutable)
```

Key files:

- `config.yml` / `config.example.yml` — YAML configuration
- `server/src/core/config/config.schema.ts` — Zod schema with types and defaults
- `server/src/core/config/config.loader.ts` — Loading, merging, resolution
- `server/src/core/config/index.ts` — Exports the `config` singleton
