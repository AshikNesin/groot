import { kv, createNamespaceKv, store } from "@/core/kv/store";
import { KeyvPrismaAdapter } from "@/core/kv/keyv-prisma-adapter";

/**
 * Global Unified KV System namespace
 */
export const KVSystem = {
  kv,
  store,
  createNamespaceKv,
  KeyvPrismaAdapter,
} as const;

export * from "@/core/kv/store";
export * from "@/core/kv/keyv-prisma-adapter";

// Maintain backwards compatibility for default imports
export default kv;
