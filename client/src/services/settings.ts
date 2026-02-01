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

const getAuthHeaders = () => {
  const token = localStorage.getItem("auth-token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const settingsService = {
  async getSettings(): Promise<AppSetting[]> {
    const response = await fetch("/api/v1/settings", {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch settings");
    }
    const result = await response.json();
    return result.data;
  },

  async getSetting(key: string): Promise<AppSetting> {
    const response = await fetch(`/api/v1/settings/${encodeURIComponent(key)}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch setting");
    }
    const result = await response.json();
    return result.data;
  },

  async upsertSetting(key: string, data: UpsertSettingData): Promise<AppSetting> {
    const response = await fetch(`/api/v1/settings/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to save setting");
    }
    const result = await response.json();
    return result.data;
  },

  async deleteSetting(key: string): Promise<void> {
    const response = await fetch(`/api/v1/settings/${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to delete setting");
    }
  },
};
