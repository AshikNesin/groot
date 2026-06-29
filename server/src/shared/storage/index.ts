import * as StorageServices from "@/shared/storage/storage.service";
import * as StorageValidation from "@/shared/storage/storage.validation";

export const StorageSystem = {
  ...StorageServices,
  validation: StorageValidation,
} as const;

export * as StorageController from "@/shared/storage/storage.controller";
export * as StorageRoutes from "@/shared/storage/storage.routes";
export * as StorageService from "@/shared/storage/storage.service";
export * as StorageValidation from "@/shared/storage/storage.validation";
