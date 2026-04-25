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

  const files: FileInfo[] = [];
  const directories = new Set<string>();

  for (const file of result.files) {
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

  return files.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function listBuckets(): Promise<BucketInfo[]> {
  const result = await StorageSystem.core.listBuckets();
  return result.buckets;
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

  return { filePath: result.filePath };
}

export async function bulkUpload(params: {
  files: Array<{ filePath: string; fileData: Buffer; contentType?: string }>;
}): Promise<{
  uploadedFiles: string[];
  failedFiles: Array<{ filePath: string; error: string }>;
}> {
  const uploadedFiles: string[] = [];
  const failedFiles: Array<{ filePath: string; error: string }> = [];
  const limit = pLimit(5);

  await Promise.all(
    params.files.map((file) =>
      limit(async () => {
        try {
          const result = await StorageSystem.core.upload({
            filePath: file.filePath,
            fileData: file.fileData,
            contentType: file.contentType,
          });

          uploadedFiles.push(result.filePath);
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

  if (!exists.exists) {
    throw Boom.notFound(`File not found: ${params.filePath}`);
  }

  const buffer = await StorageSystem.core.getBuffer({ s3Path: params.filePath });

  const fileName = params.filePath.split("/").pop() ?? "file";
  return {
    buffer,
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
  await StorageSystem.core.remove({ filePaths: params.filePaths });
  return { deletedCount: params.filePaths.length };
}

export async function getFileMetadata(params: { filePath: string }): Promise<{
  exists: boolean;
  size?: number;
  lastModified?: Date;
  fileName: string;
}> {
  const result = await StorageSystem.core.fileExists({ filePath: params.filePath });
  return {
    exists: result.exists,
    size: result.size,
    lastModified: result.lastModified,
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
  await StorageSystem.core.upload({
    filePath: `${folderPath}.keep`,
    fileData: "",
    contentType: "text/plain",
    metadata: { type: "folder-marker" },
  });
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
  const result = await StorageSystem.core.removeByPrefix({ prefix: folderPath });
  return { deletedCount: result.deletedCount };
}

export async function renameFile(params: { oldPath: string; newPath: string }): Promise<{
  newPath: string;
}> {
  const exists = await StorageSystem.core.fileExists({ filePath: params.oldPath });
  if (!exists.exists) {
    throw Boom.notFound(`Source file not found: ${params.oldPath}`);
  }

  await StorageSystem.core.copy({
    sourcePath: params.oldPath,
    destinationPath: params.newPath,
  });

  await StorageSystem.core.remove({ filePaths: [params.oldPath] });

  return { newPath: params.newPath };
}
