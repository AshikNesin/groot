import * as StorageServices from "@/shared/storage/storage.service";
import * as PublicShareServices from "@/shared/storage/public-share.service";
import * as StorageValidation from "@/shared/storage/storage.validation";

export const StorageSystem = {
  ...StorageServices,
  publicShare: PublicShareServices,
  validation: StorageValidation,
} as const;

export * as StorageController from "@/shared/storage/storage.controller";
export * as PublicFileController from "@/shared/storage/public-file.controller";
export * as StorageRoutes from "@/shared/storage/storage.routes";
export * as PublicFileRoutes from "@/shared/storage/public-file.routes";
export * as StorageService from "@/shared/storage/storage.service";
export * as PublicShareService from "@/shared/storage/public-share.service";
export * as StorageValidation from "@/shared/storage/storage.validation";
