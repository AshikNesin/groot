import { loadConfig } from "./config.loader";

export type { Config } from "./config.schema";

/**
 * Typed, frozen application configuration.
 *
 * Loaded eagerly on first import — same DX as `import { env } from "../env"`.
 * Config is deeply frozen — any mutation will throw at runtime.
 *
 * @example
 * import { config } from ".";
 * config.app.name           // "Groot"
 * config.logging.level      // "info"
 */
export const config = loadConfig();
