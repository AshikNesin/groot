import { kv, createNamespaceKv, store } from "./store";
import { PrismaKeyvAdapter } from "./keyv-prisma-adapter";

/**
 * Global Unified KV System namespace
 */
export const KVSystem = {
  kv,
  store,
  createNamespaceKv,
  PrismaKeyvAdapter,
} as const;

export * from "./store";
export * from "./keyv-prisma-adapter";

// Maintain backwards compatibility for default imports
export default kv;
