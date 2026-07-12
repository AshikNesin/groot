export * as StorageController from "./storage.controller";
export * as StorageRoutes from "./storage.routes";
export * as StorageService from "./storage.service";
export * as StorageValidation from "./storage.validation";

// Files SDK surface — consumers import everything storage-related
// from `@groot/core/storage` without reaching into `files-sdk` directly.
export { files } from "./files";
export { Files, FilesError } from "files-sdk";
export type {
  Adapter,
  AdapterCapabilities,
  Body,
  ByteRange,
  DownloadOptions,
  FileHandle,
  ListOptions,
  ListResult,
  OperationOptions,
  SignedUpload,
  SignUploadOptions,
  StoredFile,
  UploadOptions,
  UploadResult,
  UrlOptions,
} from "files-sdk";
