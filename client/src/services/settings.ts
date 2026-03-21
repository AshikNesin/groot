import { apiClient } from "@/lib/api";

export interface AppSettingMetadata {
  description?: string;
  updatedAt: string;
}

export interface AppSetting<T = unknown> {
  key: string;
  value: T;
  metadata?: AppSettingMetadata;
}

export interface UpsertSettingData {
  value: unknown;
  metadata?: {
    description?: string;
  };
}

class SettingsService {
  async getSettings(): Promise<AppSetting[]> {
    return apiClient.get<AppSetting[]>("/settings");
  }

  async getSetting(key: string): Promise<AppSetting> {
    return apiClient.get<AppSetting>(`/settings/${encodeURIComponent(key)}`);
  }

  async upsertSetting(key: string, data: UpsertSettingData): Promise<AppSetting> {
    return apiClient.put<AppSetting>(`/settings/${encodeURIComponent(key)}`, data);
  }

  async deleteSetting(key: string): Promise<void> {
    await apiClient.delete(`/settings/${encodeURIComponent(key)}`);
  }
}

export const settingsService = new SettingsService();
