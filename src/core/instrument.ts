import * as Sentry from "@sentry/node";
import { env } from "@/env";

// Initialize Sentry as early as possible
Sentry.init({
  // Use DSN from environment variables or fall back to the provided one if not set
  dsn: env.SENTRY_DSN,
  
  // Setting this option to true will send default PII data to Sentry
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});

export { Sentry };
