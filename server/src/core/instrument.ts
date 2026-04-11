import * as Sentry from "@sentry/node";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { env } from "@/core/env";

// Generate release version using SOURCE_VERSION (Heroku) or SENTRY_RELEASE env var
// Must match the logic in scripts/build.mjs
const getSentryRelease = () => {
  if (env.SENTRY_RELEASE) return env.SENTRY_RELEASE;
  const sourceVersion = process.env.SOURCE_VERSION;
  if (sourceVersion) return `groot@${sourceVersion.slice(0, 7)}`;
  // Fallback: read release written during build (dist/release.json)
  try {
    const distDir = path.dirname(fileURLToPath(import.meta.url));
    const releaseFile = path.join(distDir, "release.json");
    if (existsSync(releaseFile)) {
      return JSON.parse(readFileSync(releaseFile, "utf-8")).release;
    }
  } catch {
    // Ignore
  }
  return undefined;
};

// Initialize Sentry as early as possible
Sentry.init({
  // Use DSN from environment variables or fall back to the provided one if not set
  dsn: env.SENTRY_DSN,

  // Release identifier for source map correlation
  release: getSentryRelease(),

  // Setting this option to true will send default PII data to Sentry
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  // https://sentry.io/product/logs/
  enableLogs: true,
  integrations: [
    // https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/pino/
    Sentry.pinoIntegration(),
    // https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/zodErrors/
    Sentry.zodErrorsIntegration(),
  ],
});

export { Sentry };
