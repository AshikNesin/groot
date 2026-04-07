import type { Request } from "express";
import * as AppSettingsService from "@/shared/settings/app-settings.service";
import type { UpsertAppSettingDTO } from "@/shared/settings/app-settings.validation";

/**
 * Get all app settings
 */
export async function getAll() {
  return await AppSettingsService.getAll();
}

/**
 * Get a single app setting by key
 */
export async function getByKey(req: Request) {
  const { key } = req.params;
  return await AppSettingsService.get({ key });
}

/**
 * Upsert an app setting
 */
export async function upsert(req: Request) {
  const { key } = req.params;
  const payload = req.body as UpsertAppSettingDTO;
  return await AppSettingsService.upsert({ key, data: payload });
}

/**
 * Delete an app setting
 */
export async function deleteSetting(req: Request) {
  const { key } = req.params;
  return await AppSettingsService.deleteSetting({ key });
}
