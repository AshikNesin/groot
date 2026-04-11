import type { Readable } from "node:stream";
import pLimit from "p-limit";
import { StorageSystem } from "@/core/storage";
import { Boom } from "@/core/errors";
import { getContentType } from "@/shared/storage/storage.utils";

export interface FileInfo {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
}

export interface BucketInfo {
  name: string;
  creationDate?: Date;
}

export async function listFiles(params: {
  prefix?: string;
  delimiter?: string;
}): Promise<FileInfo[]> {
  const { prefix, delimiter = "/" } = params;
  const result = await StorageSystem.core.list({ prefix, maxKeys: 1000 });

  if (result.error) {
    throw Boom.badGateway(`Failed to list files: ${result.error.message}`);
  }

  const files: FileInfo[] = [];
  const directories = new Set<string>();

  for (const file of result.data?.files ?? []) {
    let relativePath = file.key;
    if (prefix) {
      relativePath = file.key.substring(prefix.length);
    }

    if (delimiter && relativePath.includes(delimiter)) {
      const dirName = relativePath.split(delimiter)[0];
      if (dirName && !directories.has(dirName)) {
        directories.add(dirName);
        files.push({
          key: prefix ? `${prefix}${dirName}${delimiter}` : `${dirName}${delimiter}`,
          name: dirName,
          size: 0,
          lastModified: file.lastModified,
          isDirectory: true,
        });
      }
    } else if (relativePath) {
      const name = relativePath.split(delimiter).pop() ?? relativePath;
      files.push({
        key: file.key,
        name,
        size: file.size,
        lastModified: file.lastModified,
        isDirectory: false,
      });
    }
  }

  // Sort directories first, then files alphabetically
  return files.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function listBuckets(): Promise<BucketInfo[]> {
  const result = await StorageSystem.core.listBuckets();
  if (result.error) {
    throw Boom.badGateway(`Failed to list buckets: ${result.error.message}`);
  }
  return result.data?.buckets ?? [];
}

export async function uploadFile(params: {
  filePath: string;
  fileData: Buffer | Readable | string;
  contentType?: string;
  metadata?: Record<string, string>;
}): Promise<{ filePath: string }> {
  if (!params.filePath) {
    throw Boom.badRequest("File path is required");
  }

  const result = await StorageSystem.core.upload({
    filePath: params.filePath,
    fileData: params.fileData,
    contentType: params.contentType,
    metadata: params.metadata,
  });

  if (result.error) {
    throw Boom.badGateway(`Failed to upload file: ${result.error.message}`);
  }

  return { filePath: result.data?.filePath ?? params.filePath };
}

export async function bulkUpload(params: {
  files: Array<{ filePath: string; fileData: Buffer; contentType?: string }>;
}): Promise<{
  uploadedFiles: string[];
  failedFiles: Array<{ filePath: string; error: string }>;
}> {
  const uploadedFiles: string[] = [];
  const failedFiles: Array<{ filePath: string; error: string }> = [];
  const limit = pLimit(5); // Max 5 concurrent uploads

  await Promise.all(
    params.files.map((file) =>
      limit(async () => {
        try {
          const result = await StorageSystem.core.upload({
            filePath: file.filePath,
            fileData: file.fileData,
            contentType: file.contentType,
          });

          if (result.error) {
            failedFiles.push({
              filePath: file.filePath,
              error: result.error.message,
            });
          } else {
            uploadedFiles.push(file.filePath);
          }
        } catch (error) {
          failedFiles.push({
            filePath: file.filePath,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }),
    ),
  );

  return { uploadedFiles, failedFiles };
}

export async function downloadFile(params: { filePath: string }): Promise<{
  buffer: Buffer;
  contentType?: string;
  fileName: string;
}> {
  const exists = await StorageSystem.core.fileExists({ filePath: params.filePath });
  if (exists.error) {
    throw Boom.badGateway(`Failed to verify file: ${exists.error.message}`);
  }

  if (!exists.data?.exists) {
    throw Boom.notFound(`File not found: ${params.filePath}`);
  }

  const file = await StorageSystem.core.getBuffer({ s3Path: params.filePath });
  if (file.error || !file.data) {
    throw Boom.badGateway(`Failed to download file: ${file.error?.message ?? "Unknown error"}`);
  }

  const fileName = params.filePath.split("/").pop() ?? "file";
  return {
    buffer: file.data,
    contentType: getContentType(fileName),
    fileName,
  };
}

export async function deleteFiles(params: { filePaths: string[] }): Promise<{
  deletedCount: number;
}> {
  if (!params.filePaths.length) {
    throw Boom.badRequest("No files specified for deletion");
  }
  const result = await StorageSystem.core.remove({ filePaths: params.filePaths });
  if (result.error) {
    throw Boom.badGateway(`Failed to delete files: ${result.error.message}`);
  }
  return { deletedCount: params.filePaths.length };
}

export async function getFileMetadata(params: { filePath: string }): Promise<{
  exists: boolean;
  size?: number;
  lastModified?: Date;
  fileName: string;
}> {
  const result = await StorageSystem.core.fileExists({ filePath: params.filePath });
  if (result.error) {
    throw Boom.badGateway(`Failed to get metadata: ${result.error.message}`);
  }
  return {
    exists: result.data?.exists ?? false,
    size: result.data?.size,
    lastModified: result.data?.lastModified,
    fileName: params.filePath.split("/").pop() ?? params.filePath,
  };
}

export async function createFolder({
  folderPath,
}: {
  folderPath: string;
}): Promise<{ folderPath: string }> {
  if (!folderPath.endsWith("/")) {
    throw Boom.badRequest("Folder path must end with /");
  }
  const result = await StorageSystem.core.upload({
    filePath: `${folderPath}.keep`,
    fileData: "",
    contentType: "text/plain",
    metadata: { type: "folder-marker" },
  });
  if (result.error) {
    throw Boom.badGateway(`Failed to create folder: ${result.error.message}`);
  }
  return { folderPath };
}

export async function deleteFolder({
  folderPath,
}: {
  folderPath: string;
}): Promise<{ deletedCount: number }> {
  if (!folderPath.endsWith("/")) {
    throw Boom.badRequest("Folder path must end with /");
  }
  const listResult = await StorageSystem.core.list({ prefix: folderPath, maxKeys: 1000 });
  if (listResult.error) {
    throw Boom.badGateway(`Failed to list folder contents: ${listResult.error.message}`);
  }
  const fileKeys = listResult.data?.files.map((file) => file.key) ?? [];
  if (!fileKeys.length) {
    return { deletedCount: 0 };
  }
  const deleteResult = await StorageSystem.core.remove({ filePaths: fileKeys });
  if (deleteResult.error) {
    throw Boom.badGateway(`Failed to delete folder: ${deleteResult.error.message}`);
  }
  return { deletedCount: fileKeys.length };
}

export async function renameFile(params: { oldPath: string; newPath: string }): Promise<{
  newPath: string;
}> {
  const exists = await StorageSystem.core.fileExists({ filePath: params.oldPath });
  if (exists.error || !exists.data?.exists) {
    throw Boom.notFound(`Source file not found: ${params.oldPath}`);
  }

  const copyResult = await StorageSystem.core.copy({
    sourcePath: params.oldPath,
    destinationPath: params.newPath,
  });
  if (copyResult.error) {
    throw Boom.badGateway(`Failed to copy file: ${copyResult.error.message}`);
  }

  const deleteResult = await StorageSystem.core.remove({ filePaths: [params.oldPath] });
  if (deleteResult.error) {
    throw Boom.badGateway(`Failed to delete old file: ${deleteResult.error.message}`);
  }

  return { newPath: params.newPath };
}
