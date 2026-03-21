---
name: environment
description: Environment configuration and secrets management
metadata:
  tags: environment, configuration, env, secrets
---

# Environment Configuration in Node.js

## Project Approach: Varlock + Infisical

This project uses [Varlock](https://varlock.dev) with the [Infisical](https://infisical.com) plugin for secrets management:

### .env.schema File

The `.env.schema` file is the single source of truth for environment variables. It uses `@env-spec` annotations:

```bash
# @env-spec - see https://varlock.dev/env-spec

# @defaultRequired=infer @defaultSensitive=true
# @generateTypes(lang=ts, path=env.d.ts)
# @plugin(@varlock/infisical-plugin)
# @initInfisical(projectId=$INFISICAL_PROJECT_ID, environment=$INFISICAL_ENVIRONMENT, ...)

# @type=enum(development, production, test)
# @required @public
NODE_ENV=development

# @type=url
# @required
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# @required
# @type=string(minLength=32)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
```

Key annotations:
- `@required` - Variable must be set
- `@public` - Safe to expose to client (not a secret)
- `@type=enum(a, b, c)` - Enum validation
- `@type=url`, `@type=number`, `@type=boolean` - Type coercion
- `@type=string(minLength=N)` - String validation
- `@generateTypes(lang=ts, path=env.d.ts)` - Auto-generate TypeScript types

### Running Commands

All commands that need environment variables must run through varlock:

```bash
# In package.json scripts
"dev": "varlock run -- tsx scripts/dev.ts"
"start": "varlock run -- node dist/bundle.js"
"test": "varlock run -- vitest run"
```

### Accessing Environment Variables

Import the validated ENV object:

```typescript
import { ENV } from "varlock/env";

export const env = ENV;

// Usage
const dbUrl = env.DATABASE_URL;
const port = env.PORT;
```

For auto-loading in any file:

```typescript
import "varlock/auto-load";
```

### Local Development

1. Install Varlock CLI
2. Run `pnpm dev` - varlock loads `.env.schema` and injects secrets from Infisical
3. Secrets are synced with Infisical cloud (or self-hosted)

### Production

1. Set `INFISICAL_PROJECT_ID`, `INFISICAL_ENVIRONMENT`, `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`
2. Varlock fetches secrets from Infisical at runtime
3. No `.env` files needed in production

---

## Alternative: Loading Environment Files

Use Node.js built-in `--env-file` flag to load environment variables:

```bash
# Load from .env file
node --env-file=.env app.ts

# Load multiple env files (later files override earlier ones)
node --env-file=.env --env-file=.env.local app.ts
```

### Programmatic API

Load environment files programmatically with `process.loadEnvFile()`:

```typescript
import { loadEnvFile } from "node:process";

// Load .env from current directory
loadEnvFile();

// Load specific file
loadEnvFile(".env.local");
```

## Environment Variables Validation

### Using env-schema with TypeBox

Use [env-schema](https://github.com/fastify/env-schema) with [TypeBox](https://github.com/sinclairzx81/typebox) for type-safe environment validation:

```typescript
import { envSchema } from "env-schema";
import { Type, Static } from "@sinclair/typebox";

const schema = Type.Object({
  PORT: Type.Number({ default: 3000 }),
  DATABASE_URL: Type.String(),
  API_KEY: Type.String({ minLength: 1 }),
  LOG_LEVEL: Type.Union(
    [Type.Literal("debug"), Type.Literal("info"), Type.Literal("warn"), Type.Literal("error")],
    { default: "info" },
  ),
});

type Env = Static<typeof schema>;

export const env = envSchema<Env>({ schema });
```

### Using Zod

Alternatively, use [Zod](https://github.com/colinhacks/zod) for validation:

```typescript
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
```

## Avoid NODE_ENV

`NODE_ENV` is an antipattern. It conflates multiple concerns into a single variable:

- **Environment detection** (development vs production vs staging)
- **Behavior toggling** (verbose logging, debug features)
- **Optimization flags** (minification, caching)
- **Security settings** (strict validation, HTTPS)

This leads to problems:

```typescript
// BAD - NODE_ENV conflates concerns
if (process.env.NODE_ENV === "development") {
  enableDebugLogging(); // logging concern
  disableRateLimiting(); // security concern
  useMockDatabase(); // infrastructure concern
}
```

Instead, use explicit environment variables for each concern:

```typescript
// GOOD - explicit variables for each concern
const config = {
  logging: {
    level: process.env.LOG_LEVEL || "info",
    pretty: process.env.LOG_PRETTY === "true",
  },
  security: {
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== "false",
    httpsOnly: process.env.HTTPS_ONLY === "true",
  },
  database: {
    url: process.env.DATABASE_URL,
  },
};
```

This approach:

- Makes configuration explicit and discoverable
- Allows fine-grained control per environment
- Avoids hidden behavior changes
- Makes testing easier (toggle individual features)

## Configuration Object Pattern

Create a typed configuration object:

```typescript
interface Config {
  server: {
    port: number;
    host: string;
  };
  database: {
    url: string;
    poolSize: number;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
  };
  features: {
    enableMetrics: boolean;
    enableTracing: boolean;
  };
}

function createConfig(): Config {
  return {
    server: {
      port: parseInt(process.env.PORT || "3000", 10),
      host: process.env.HOST || "0.0.0.0",
    },
    database: {
      url: requireEnv("DATABASE_URL"),
      poolSize: parseInt(process.env.DB_POOL_SIZE || "10", 10),
    },
    auth: {
      jwtSecret: requireEnv("JWT_SECRET"),
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
    },
    features: {
      enableMetrics: process.env.ENABLE_METRICS === "true",
      enableTracing: process.env.ENABLE_TRACING === "true",
    },
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = createConfig();
```

## .env File Structure (Without Varlock)

For projects not using Varlock, organize .env files properly:

```bash
# .env.schema - committed to git, documents all variables with defaults
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/db
API_KEY=your-api-key-here

# .env - local development, NOT committed (in .gitignore)
PORT=3000
DATABASE_URL=postgresql://dev:dev@localhost:5432/myapp
API_KEY=sk-dev-key-123

# .env.test - test environment overrides
DATABASE_URL=postgresql://test:test@localhost:5432/myapp_test
```

## Secrets in Production

Never commit secrets to version control. Use a secrets management service:

**Cloud Provider Services:**

- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager)
- [Azure Key Vault](https://azure.microsoft.com/en-us/products/key-vault)

**Infrastructure Tools:**

- [HashiCorp Vault](https://www.vaultproject.io/)
- [Doppler](https://www.doppler.com/)
- [Infisical](https://infisical.com/)

**Container Orchestration:**

- Kubernetes Secrets
- Docker Swarm Secrets

**CI/CD Platforms:**

- GitHub Actions Secrets
- GitLab CI/CD Variables
- CircleCI Contexts

These services inject secrets as environment variables at runtime, keeping them out of your codebase and version history.

## Feature Flags

Implement feature flags via environment:

```typescript
const features = {
  newDashboard: process.env.FEATURE_NEW_DASHBOARD === "true",
  betaApi: process.env.FEATURE_BETA_API === "true",
  darkMode: process.env.FEATURE_DARK_MODE === "true",
};

export function isFeatureEnabled(feature: keyof typeof features): boolean {
  return features[feature] ?? false;
}
```
