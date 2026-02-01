import { createNamespaceKv } from "@/core/kv";
import { logger } from "@/core/logger";

const appSettingsKv = createNamespaceKv("APP_SETTING");

export interface AppSettingMetadata {
  description?: string;
  updatedAt: string;
}

export interface AppSetting<T = unknown> {
  key: string;
  value: T;
  metadata?: AppSettingMetadata;
}

export const get = async <T = unknown>(
  key: string,
): Promise<AppSetting<T> | null> => {
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
};

export const getAll = async (): Promise<AppSetting[]> => {
  try {
    const keys = await getAllKeys();
    const settings: AppSetting[] = [];

    for (const key of keys) {
      const setting = await get(key);
      if (setting) {
        settings.push(setting);
      }
    }

    return settings;
  } catch (error) {
    logger.error({ error }, "Failed to get all app settings");
    throw error;
  }
};

const getAllKeys = async (): Promise<string[]> => {
  const keysRegistry = await appSettingsKv.get<string[]>("_keys");
  return keysRegistry || [];
};

const addKeyToRegistry = async (key: string): Promise<void> => {
  const keys = await getAllKeys();
  if (!keys.includes(key)) {
    keys.push(key);
    await appSettingsKv.set("_keys", keys);
  }
};

const removeKeyFromRegistry = async (key: string): Promise<void> => {
  const keys = await getAllKeys();
  const filteredKeys = keys.filter((k) => k !== key);
  await appSettingsKv.set("_keys", filteredKeys);
};

export const set = async <T = unknown>(
  key: string,
  value: T,
  metadata?: Partial<AppSettingMetadata>,
): Promise<AppSetting<T>> => {
  try {
    const setting: AppSetting<T> = {
      key,
      value,
      metadata: {
        ...metadata,
        updatedAt: new Date().toISOString(),
      },
    };

    await appSettingsKv.set(key, setting);
    await addKeyToRegistry(key);

    logger.info({ key }, "App setting updated");
    return setting;
  } catch (error) {
    logger.error({ error, key }, "Failed to set app setting");
    throw error;
  }
};

export const remove = async (key: string): Promise<boolean> => {
  try {
    const deleted = await appSettingsKv.delete(key);
    if (deleted) {
      await removeKeyFromRegistry(key);
      logger.info({ key }, "App setting deleted");
    }
    return deleted;
  } catch (error) {
    logger.error({ error, key }, "Failed to delete app setting");
    throw error;
  }
};

export const exists = async (key: string): Promise<boolean> => {
  try {
    const value = await appSettingsKv.get(key);
    return value !== undefined && value !== null;
  } catch (error) {
    logger.error({ error, key }, "Failed to check app setting existence");
    throw error;
  }
};
