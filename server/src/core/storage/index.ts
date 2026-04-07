import { StorageService } from "@/core/storage/service";
import { S3Client } from "@aws-sdk/client-s3";

/**
 * Global Storage System instance
 */
export const storage = new StorageService();

/**
 * Namespace export unifying the storage architecture
 */
export const StorageSystem = {
  core: storage,
  StorageService,
} as const;

// Types
export * from "@/core/storage/types";
export { StorageService, S3Client };
