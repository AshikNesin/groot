import * as StorageServices from "./storage.service";
import * as PublicShareServices from "./public-share.service";
import * as StorageValidation from "./storage.validation";

export const StorageSystem = {
  ...StorageServices,
  publicShare: PublicShareServices,
  validation: StorageValidation,
} as const;

export * as StorageController from "./storage.controller";
export * as PublicFileController from "./public-file.controller";
export * as StorageRoutes from "./storage.routes";
export * as PublicFileRoutes from "./public-file.routes";
export * as StorageService from "./storage.service";
export * as PublicShareService from "./public-share.service";
export * as StorageValidation from "./storage.validation";
