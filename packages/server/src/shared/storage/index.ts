import * as StorageServices from "./storage.service";
import * as StorageValidation from "./storage.validation";

export const StorageSystem = {
  ...StorageServices,
  validation: StorageValidation,
} as const;

export * as StorageController from "./storage.controller";
export * as StorageRoutes from "./storage.routes";
export * as StorageService from "./storage.service";
export * as StorageValidation from "./storage.validation";
