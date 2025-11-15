import { prisma } from "@/core/database";
import { logger } from "@/core/logger";
import type { PrismaClient } from "@/generated/prisma";

/**
 * Prisma-based Keyv Storage Adapter
 *
 * Implements the Keyv storage interface using Prisma Client for database operations.
 * This replaces @keyv/postgres to use the centralized Prisma client and leverage
 * the Keyv model defined in the Prisma schema.
 */
export class KeyvPrismaAdapter {
  private prisma: PrismaClient;
  private namespace?: string;

  constructor(options: { prisma?: PrismaClient; namespace?: string } = {}) {
    this.prisma = options.prisma || prisma;
    this.namespace = options.namespace;
  }

  /**
   * Generate namespaced key
   */
  private getKey(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key;
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<any> {
    try {
      const namespacedKey = this.getKey(key);
      const record = await this.prisma.keyv.findUnique({
        where: { key: namespacedKey },
      });

      if (!record) {
        return undefined;
      }

      // Deserialize value
      try {
        return JSON.parse(record.value);
      } catch {
        return record.value;
      }
    } catch (error) {
      logger.error({ error, key, namespace: this.namespace }, "Failed to get from Keyv");
      throw error;
    }
  }

  /**
   * Set a value with optional TTL
   * Note: TTL is ignored as the Keyv model doesn't have expiry support
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const namespacedKey = this.getKey(key);
      const serializedValue = typeof value === "string" ? value : JSON.stringify(value);

      await this.prisma.keyv.upsert({
        where: { key: namespacedKey },
        update: {
          value: serializedValue,
        },
        create: {
          key: namespacedKey,
          value: serializedValue,
        },
      });

      logger.debug(
        { key, namespace: this.namespace, ttlIgnored: !!ttl },
        "Set value in Keyv"
      );
    } catch (error) {
      logger.error({ error, key, namespace: this.namespace }, "Failed to set in Keyv");
      throw error;
    }
  }

  /**
   * Delete a value by key
   */
  async delete(key: string): Promise<boolean> {
    try {
      const namespacedKey = this.getKey(key);
      const result = await this.prisma.keyv.delete({
        where: { key: namespacedKey },
      }).catch(() => null);

      const deleted = !!result;
      logger.debug({ key, namespace: this.namespace, deleted }, "Delete from Keyv");
      return deleted;
    } catch (error) {
      logger.error({ error, key, namespace: this.namespace }, "Failed to delete from Keyv");
      return false;
    }
  }

  /**
   * Clear all values (optionally within namespace)
   */
  async clear(): Promise<void> {
    try {
      if (this.namespace) {
        // Delete all keys with this namespace prefix
        await this.prisma.keyv.deleteMany({
          where: {
            key: {
              startsWith: `${this.namespace}:`,
            },
          },
        });
        logger.debug({ namespace: this.namespace }, "Cleared namespaced Keyv entries");
      } else {
        // Clear all entries (use with caution!)
        await this.prisma.keyv.deleteMany({});
        logger.warn("Cleared all Keyv entries");
      }
    } catch (error) {
      logger.error({ error, namespace: this.namespace }, "Failed to clear Keyv");
      throw error;
    }
  }

  /**
   * Get multiple values by keys
   */
  async getMany(keys: string[]): Promise<any[]> {
    try {
      const namespacedKeys = keys.map((key) => this.getKey(key));
      const records = await this.prisma.keyv.findMany({
        where: {
          key: {
            in: namespacedKeys,
          },
        },
      });

      // Create a map of keys to values
      const recordMap = new Map(
        records.map((record) => [record.key, record])
      );

      // Return values in the same order as keys
      return keys.map((key) => {
        const namespacedKey = this.getKey(key);
        const record = recordMap.get(namespacedKey);

        if (!record) {
          return undefined;
        }

        // Deserialize value
        try {
          return JSON.parse(record.value);
        } catch {
          return record.value;
        }
      });
    } catch (error) {
      logger.error({ error, keys, namespace: this.namespace }, "Failed to get many from Keyv");
      throw error;
    }
  }

  /**
   * Check if a key has a value (not expired)
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * Disconnect from database (cleanup)
   */
  async disconnect(): Promise<void> {
    // The Prisma client is shared, so we don't disconnect here
    // Disconnect is handled by the application shutdown
    logger.debug("KeyvPrismaAdapter disconnect called (no-op)");
  }
}
