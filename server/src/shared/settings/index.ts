import * as SettingsServices from "@/shared/settings/app-settings.service";
import * as SettingsValidation from "@/shared/settings/app-settings.validation";
import { appSettingsModel } from "@/shared/settings/app-settings.model";

export const SettingSystem = {
  ...SettingsServices,
  validation: SettingsValidation,
  model: appSettingsModel,
} as const;

export * as SettingController from "@/shared/settings/app-settings.controller";
export * as SettingRoutes from "@/shared/settings/app-settings.routes";
export * as SettingService from "@/shared/settings/app-settings.service";
export * as SettingValidation from "@/shared/settings/app-settings.validation";
export * as SettingModel from "@/shared/settings/app-settings.model";
