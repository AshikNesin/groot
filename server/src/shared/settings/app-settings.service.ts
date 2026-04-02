import { Boom } from "@/core/errors";
import { appSettingsModel } from "@/shared/settings/app-settings.model";
import type { AppSetting } from "@/shared/settings/app-settings.model";
import type { UpsertAppSettingDTO } from "@/shared/settings/app-settings.validation";

class AppSettingsService {
  async get<T = unknown>(key: string): Promise<AppSetting<T>> {
    const setting = await appSettingsModel.get<T>(key);
    if (!setting) {
      throw Boom.notFound(`App Setting '${key}' not found`);
    }
    return setting;
  }

  async getAll(): Promise<AppSetting[]> {
    return appSettingsModel.getAll();
  }

  async upsert<T = unknown>(key: string, data: UpsertAppSettingDTO): Promise<AppSetting<T>> {
    return appSettingsModel.set<T>(key, data.value as T, data.metadata);
  }

  async delete(key: string): Promise<void> {
    const exists = await appSettingsModel.exists(key);
    if (!exists) {
      throw Boom.notFound(`App Setting '${key}' not found`);
    }
    await appSettingsModel.remove(key);
  }
}

export const appSettingsService = new AppSettingsService();
