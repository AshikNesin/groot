import * as SettingsServices from "./app-settings.service";
import * as SettingsValidation from "./app-settings.validation";
import { appSettingsModel } from "./app-settings.model";

export const SettingSystem = {
  ...SettingsServices,
  validation: SettingsValidation,
  model: appSettingsModel,
} as const;

export * as SettingController from "./app-settings.controller";
export * as SettingRoutes from "./app-settings.routes";
export * as SettingService from "./app-settings.service";
export * as SettingValidation from "./app-settings.validation";
export * as SettingModel from "./app-settings.model";
