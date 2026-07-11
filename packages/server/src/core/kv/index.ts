import { kv, createNamespaceKv, store } from "./store";

/**
 * Global Unified KV System namespace
 */
export const KVSystem = {
  kv,
  store,
  createNamespaceKv,
} as const;

export * from "./store";

// Maintain backwards compatibility for default imports
export default kv;
