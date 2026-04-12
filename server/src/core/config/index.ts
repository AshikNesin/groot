import { loadConfig } from "@/core/config/config.loader";

export type { Config } from "@/core/config/config.schema";

/**
 * Typed, frozen application configuration.
 *
 * Loaded eagerly on first import — same DX as `import { env } from "@/core/env"`.
 * Config is deeply frozen — any mutation will throw at runtime.
 *
 * @example
 * import { config } from "@/core/config";
 * config.app.name           // "Groot"
 * config.ai.defaultProvider // "openai"
 * config.features.enableNotifications // false
 */
export const config = loadConfig();
