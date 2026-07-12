import * as core from "./core";

// Backwards compatibility core logger export
export const logger = core.logger;
export default logger;

// Flat exports
export * from "./core";
export * from "./factories";
export * from "./context";
export * from "./trace-context";
export * from "./breadcrumbs";
export * from "./utils";
