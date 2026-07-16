import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { env } from "./env";
import { config } from "./config";

// Generate release version using SOURCE_VERSION (Heroku) or SENTRY_RELEASE env var
// Must match the logic in scripts/build.mjs
const getSentryRelease = () => {
  if (env.SENTRY_RELEASE) return env.SENTRY_RELEASE;
  const sourceVersion = env.SOURCE_COMMIT || process.env.SOURCE_VERSION;
  if (sourceVersion) return `${config.app.name.toLowerCase()}@${sourceVersion.slice(0, 7)}`;
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

// Sentry is only initialised when a real DSN is configured. Without a DSN the
// entire @sentry/node import is skipped, which avoids loading the OpenTelemetry
// SDK (api, core, sdk-trace, resources, semantic-conventions, etc.) into memory
// — roughly 5-10 MB of JS modules that are useless without a reporting endpoint.
const dsn = config.sentry.dsn;
const sentryEnabled = !!dsn && dsn.startsWith("https://");

let Sentry: typeof import("@sentry/node");

if (sentryEnabled) {
  const sentryModule = await import("@sentry/node");
  Sentry = sentryModule;
  Sentry.init({
    dsn,
    release: getSentryRelease(),
    environment: env.NODE_ENV,
    sendDefaultPii: true,
    enableLogs: true,
    integrations: [Sentry.pinoIntegration(), Sentry.zodErrorsIntegration()],
  });
} else {
  // Stub — all methods are no-ops when Sentry is disabled.
  Sentry = {
    init: () => {},
    captureException: () => "",
    captureMessage: () => "",
    withScope: (cb: (scope: unknown) => void) => cb({}),
    configureScope: () => {},
    setUser: () => {},
    setTag: () => {},
    setExtra: () => {},
    setContext: () => {},
    addBreadcrumb: () => {},
    startSpan: async (_opts: unknown, cb: () => unknown) => cb(),
    setupExpressErrorHandler: () => {},
    pinoIntegration: () => ({}),
    zodErrorsIntegration: () => ({}),
  } as unknown as typeof import("@sentry/node");
}

export { Sentry };
export { sentryEnabled };
