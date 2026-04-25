import dayjs from "dayjs";
import { createNamespaceKv } from "@/core/kv";
import { logger } from "@/core/logger";
import { prisma } from "@/core/database";

const KV_NAMESPACE = "APP_SETTING";
const KV_NAMESPACE_PREFIX = `${KV_NAMESPACE}:`;
const appSettingsKv = createNamespaceKv(KV_NAMESPACE);

export interface AppSettingMetadata {
  description?: string;
  updatedAt: string;
}

export interface AppSetting<T = unknown> {
  key: string;
  value: T;
  metadata?: AppSettingMetadata;
}

class AppSettingsModel {
  async get<T = unknown>(key: string): Promise<AppSetting<T> | null> {
    try {
      const value = await appSettingsKv.get<AppSetting<T>>(key);
      if (!value) {
        return null;
      }
      return value;
    } catch (error) {
      logger.error({ error, key }, "Failed to get app setting");
      throw error;
    }
  }

  async getAll(): Promise<AppSetting[]> {
    try {
      const keys = await this.getAllKeys();
      const settings: AppSetting[] = [];

      for (const key of keys) {
        const setting = await this.get(key);
        if (setting) {
          settings.push(setting);
        }
      }

      return settings;
    } catch (error) {
      logger.error({ error }, "Failed to get all app settings");
      throw error;
    }
  }

  private async getAllKeys(): Promise<string[]> {
    const rows = await prisma.$queryRaw<Array<{ key: string }>>`
      SELECT key FROM keyv
      WHERE key LIKE ${KV_NAMESPACE_PREFIX + "%"}
    `;
    return rows.map((r) => r.key.replace(KV_NAMESPACE_PREFIX, ""));
  }

  async set<T = unknown>(
    key: string,
    value: T,
    metadata?: Partial<AppSettingMetadata>,
  ): Promise<AppSetting<T>> {
    try {
      const setting: AppSetting<T> = {
        key,
        value,
        metadata: {
          ...metadata,
          updatedAt: dayjs().toISOString(),
        },
      };

      await appSettingsKv.set(key, setting);

      logger.info({ key }, "App setting updated");
      return setting;
    } catch (error) {
      logger.error({ error, key }, "Failed to set app setting");
      throw error;
    }
  }

  async remove(key: string): Promise<boolean> {
    try {
      const deleted = await appSettingsKv.delete(key);
      if (deleted) {
        logger.info({ key }, "App setting deleted");
      }
      return deleted;
    } catch (error) {
      logger.error({ error, key }, "Failed to delete app setting");
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const value = await appSettingsKv.get(key);
      return value !== undefined && value !== null;
    } catch (error) {
      logger.error({ error, key }, "Failed to check app setting existence");
      throw error;
    }
  }
}

export const appSettingsModel = new AppSettingsModel();
