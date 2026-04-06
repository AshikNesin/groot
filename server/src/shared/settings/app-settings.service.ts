import { Boom } from "@/core/errors";
import { appSettingsModel } from "./app-settings.model";
import type { AppSetting } from "./app-settings.model";
import type { UpsertAppSettingDTO } from "./app-settings.validation";

export async function get<T = unknown>({ key }: { key: string }): Promise<AppSetting<T>> {
  const setting = await appSettingsModel.get<T>(key);
  if (!setting) {
    throw Boom.notFound(`App Setting '${key}' not found`);
  }
  return setting;
}

export async function getAll(): Promise<AppSetting[]> {
  return appSettingsModel.getAll();
}

export async function upsert<T = unknown>({
  key,
  data,
}: {
  key: string;
  data: UpsertAppSettingDTO;
}): Promise<AppSetting<T>> {
  return appSettingsModel.set<T>(key, data.value as T, data.metadata);
}

export async function deleteSetting({ key }: { key: string }): Promise<void> {
  const exists = await appSettingsModel.exists(key);
  if (!exists) {
    throw Boom.notFound(`App Setting '${key}' not found`);
  }
  await appSettingsModel.remove(key);
}
