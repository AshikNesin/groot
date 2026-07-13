import dayjs from "dayjs";
import { Boom } from "@groot/core/errors";
import { logger } from "@groot/core/logger";
import { prisma } from "@groot/core/database";
import { createNamespaceKv } from "@groot/core/kv";
import type { UpsertAppSettingDTO } from "./app-settings.validation";

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

// ── KV-backed data access ──────────────────────────────────────────────────

async function getSetting<T = unknown>(key: string): Promise<AppSetting<T> | null> {
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

async function getAllEntries(): Promise<AppSetting[]> {
  const rows = await prisma.$queryRaw<Array<{ key: string; value: string }>>`
    SELECT key, value FROM keyv
    WHERE key LIKE ${KV_NAMESPACE_PREFIX + "%"}
  `;
  return rows
    .map((r) => {
      try {
        const envelope = JSON.parse(r.value) as { value?: AppSetting };
        const setting = envelope.value;
        if (!setting) return null;
        return { ...setting, key: r.key.replace(KV_NAMESPACE_PREFIX, "") };
      } catch {
        return null;
      }
    })
    .filter((s): s is AppSetting => s !== null);
}

async function setSetting<T = unknown>(
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

async function removeSetting(key: string): Promise<boolean> {
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

async function settingExists(key: string): Promise<boolean> {
  try {
    return await appSettingsKv.has(key);
  } catch (error) {
    logger.error({ error, key }, "Failed to check app setting existence");
    throw error;
  }
}

// ── Service ────────────────────────────────────────────────────────────────

export async function get<T = unknown>({ key }: { key: string }): Promise<AppSetting<T>> {
  const setting = await getSetting<T>(key);
  if (!setting) {
    throw Boom.notFound(`App Setting '${key}' not found`);
  }
  return setting;
}

export async function getAll(): Promise<AppSetting[]> {
  try {
    return await getAllEntries();
  } catch (error) {
    logger.error({ error }, "Failed to get all app settings");
    throw error;
  }
}

export async function upsert<T = unknown>({
  key,
  data,
}: {
  key: string;
  data: UpsertAppSettingDTO;
}): Promise<AppSetting<T>> {
  return setSetting<T>(key, data.value as T, data.metadata);
}

export async function deleteSetting({ key }: { key: string }): Promise<void> {
  const exists = await settingExists(key);
  if (!exists) {
    throw Boom.notFound(`App Setting '${key}' not found`);
  }
  await removeSetting(key);
}
