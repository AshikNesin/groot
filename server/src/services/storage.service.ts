import type { Readable } from "node:stream";
import { StorageService } from "@/core/storage";
import { BadRequestError, NotFoundError } from "@/core/errors/base.errors";

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

export class StorageFileService {
  private readonly storage = new StorageService();

  async listFiles(params: { prefix?: string; delimiter?: string }): Promise<FileInfo[]> {
    const { prefix, delimiter = "/" } = params;
    const result = await this.storage.list(prefix, 1000);

    if (result.error) {
      throw new Error(`Failed to list files: ${result.error.message}`);
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

  async listBuckets(): Promise<BucketInfo[]> {
    const result = await this.storage.listBuckets();
    if (result.error) {
      throw new Error(`Failed to list buckets: ${result.error.message}`);
    }
    return result.data?.buckets ?? [];
  }

  async uploadFile(params: {
    filePath: string;
    fileData: Buffer | Readable | string;
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<{ filePath: string }> {
    if (!params.filePath) {
      throw new BadRequestError("File path is required");
    }

    const result = await this.storage.upload(params.filePath, params.fileData, {
      contentType: params.contentType,
      metadata: params.metadata,
    });

    if (result.error) {
      throw new Error(`Failed to upload file: ${result.error.message}`);
    }

    return { filePath: result.data?.filePath ?? params.filePath };
  }

  async bulkUpload(params: {
    files: Array<{ filePath: string; fileData: Buffer; contentType?: string }>;
  }): Promise<{ uploadedFiles: string[]; failedFiles: Array<{ filePath: string; error: string }> }> {
    const uploadedFiles: string[] = [];
    const failedFiles: Array<{ filePath: string; error: string }> = [];

    await Promise.all(
      params.files.map(async (file) => {
        try {
          const result = await this.storage.upload(file.filePath, file.fileData, {
            contentType: file.contentType,
          });

          if (result.error) {
            failedFiles.push({ filePath: file.filePath, error: result.error.message });
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
    );

    return { uploadedFiles, failedFiles };
  }

  async downloadFile(params: { filePath: string }): Promise<{ buffer: Buffer; contentType?: string; fileName: string }> {
    const exists = await this.storage.fileExists(params.filePath);
    if (exists.error) {
      throw new Error(`Failed to verify file: ${exists.error.message}`);
    }

    if (!exists.data?.exists) {
      throw new NotFoundError(`File not found: ${params.filePath}`);
    }

    const file = await this.storage.getBuffer(params.filePath);
    if (file.error || !file.data) {
      throw new Error(`Failed to download file: ${file.error?.message ?? "Unknown error"}`);
    }

    const fileName = params.filePath.split("/").pop() ?? "file";
    return {
      buffer: file.data,
      contentType: this.getContentType(fileName),
      fileName,
    };
  }

  async deleteFiles(params: { filePaths: string[] }): Promise<{ deletedCount: number }> {
    if (!params.filePaths.length) {
      throw new BadRequestError("No files specified for deletion");
    }
    const result = await this.storage.remove(params.filePaths);
    if (result.error) {
      throw new Error(`Failed to delete files: ${result.error.message}`);
    }
    return { deletedCount: params.filePaths.length };
  }

  async getFileMetadata(params: { filePath: string }): Promise<{
    exists: boolean;
    size?: number;
    lastModified?: Date;
    fileName: string;
  }> {
    const result = await this.storage.fileExists(params.filePath);
    if (result.error) {
      throw new Error(`Failed to get metadata: ${result.error.message}`);
    }
    return {
      exists: result.data?.exists ?? false,
      size: result.data?.size,
      lastModified: result.data?.lastModified,
      fileName: params.filePath.split("/").pop() ?? params.filePath,
    };
  }

  async createFolder(folderPath: string): Promise<{ folderPath: string }> {
    if (!folderPath.endsWith("/")) {
      throw new BadRequestError("Folder path must end with /");
    }
    const result = await this.storage.upload(`${folderPath}.keep`, "", {
      contentType: "text/plain",
      metadata: { type: "folder-marker" },
    });
    if (result.error) {
      throw new Error(`Failed to create folder: ${result.error.message}`);
    }
    return { folderPath };
  }

  async deleteFolder(folderPath: string): Promise<{ deletedCount: number }> {
    if (!folderPath.endsWith("/")) {
      throw new BadRequestError("Folder path must end with /");
    }
    const listResult = await this.storage.list(folderPath, 1000);
    if (listResult.error) {
      throw new Error(`Failed to list folder contents: ${listResult.error.message}`);
    }
    const fileKeys = listResult.data?.files.map((file) => file.key) ?? [];
    if (!fileKeys.length) {
      return { deletedCount: 0 };
    }
    const deleteResult = await this.storage.remove(fileKeys);
    if (deleteResult.error) {
      throw new Error(`Failed to delete folder: ${deleteResult.error.message}`);
    }
    return { deletedCount: fileKeys.length };
  }

  async renameFile(params: { oldPath: string; newPath: string }): Promise<{ newPath: string }> {
    const exists = await this.storage.fileExists(params.oldPath);
    if (exists.error || !exists.data?.exists) {
      throw new NotFoundError(`Source file not found: ${params.oldPath}`);
    }

    const copyResult = await this.storage.copy(params.oldPath, params.newPath);
    if (copyResult.error) {
      throw new Error(`Failed to copy file: ${copyResult.error.message}`);
    }

    const deleteResult = await this.storage.remove([params.oldPath]);
    if (deleteResult.error) {
      throw new Error(`Failed to delete old file: ${deleteResult.error.message}`);
    }

    return { newPath: params.newPath };
  }

  private getContentType(fileName: string): string {
    const extension = fileName.split(".").pop()?.toLowerCase();
    const map: Record<string, string> = {
      pdf: "application/pdf",
      json: "application/json",
      csv: "text/csv",
      txt: "text/plain",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      svg: "image/svg+xml",
      html: "text/html",
      xml: "application/xml",
    };
    if (!extension) {
      return "application/octet-stream";
    }
    return map[extension] ?? "application/octet-stream";
  }
}

export const storageFileService = new StorageFileService();
