export { files } from "@/core/storage/files";

// Re-export the SDK surface so consumers import everything storage-related
// from `@/core/storage` without reaching into `files-sdk` directly.
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
