import { NotFoundError } from "@/core/errors/base.errors";
import * as appSettingsModel from "@/models/app-settings.model";
import type { AppSetting } from "@/models/app-settings.model";
import type { UpsertAppSettingDTO } from "@/validations/app-settings.validation";

class AppSettingsService {
  async get<T = unknown>(key: string): Promise<AppSetting<T>> {
    const setting = await appSettingsModel.get<T>(key);
    if (!setting) {
      throw new NotFoundError("App Setting", key);
    }
    return setting;
  }

  async getAll(): Promise<AppSetting[]> {
    return appSettingsModel.getAll();
  }

  async upsert<T = unknown>(
    key: string,
    data: UpsertAppSettingDTO,
  ): Promise<AppSetting<T>> {
    return appSettingsModel.set<T>(key, data.value as T, data.metadata);
  }

  async delete(key: string): Promise<void> {
    const exists = await appSettingsModel.exists(key);
    if (!exists) {
      throw new NotFoundError("App Setting", key);
    }
    await appSettingsModel.remove(key);
  }
}

export const appSettingsService = new AppSettingsService();
