import { FilesError } from "files-sdk";
import { files } from "../../core/storage";
import { Boom } from "../../core/errors";
import { getContentType } from "./storage.utils";

export interface FileInfo {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
}

/**
 * List one level of a "folder" under `prefix`, or every key when no delimiter
 * is passed. Folders come from the adapter's common-prefix listing (S3-style
 * `prefixes`); files are the {@link StoredFile} items. The cursor is drained
 * so a level with more than one page of results is returned in full.
 */
export async function listFiles(params: {
  prefix?: string;
  delimiter?: string;
}): Promise<FileInfo[]> {
  const { prefix, delimiter = "/" } = params;
  // Derive names against the effective separator. Empty/undefined delimiter
  // (flat-list mode) falls back to "/" so a key's last path segment still wins.
  const sep = delimiter || "/";
  const listOpts = delimiter ? { prefix, delimiter, limit: 1000 } : { prefix, limit: 1000 };

  const directories: FileInfo[] = [];
  const fileInfos: FileInfo[] = [];

  // Drain the cursor so we return the complete level, not just the first page.
  let cursor: string | undefined;
  do {
    const page = await files.list({ ...listOpts, cursor });

    for (const dirKey of page.prefixes ?? []) {
      const relative = prefix ? dirKey.slice(prefix.length) : dirKey;
      const name = relative.endsWith(sep) ? relative.slice(0, -sep.length) : relative;
      directories.push({
        key: dirKey,
        name,
        size: 0,
        lastModified: new Date(0),
        isDirectory: true,
      });
    }

    for (const file of page.items) {
      const relative = prefix ? file.key.slice(prefix.length) : file.key;
      if (!relative) continue;
      fileInfos.push({
        key: file.key,
        name: relative.split(sep).pop() ?? relative,
        size: file.size,
        // Stable sentinel when the adapter omits the timestamp — never "now".
        lastModified: file.lastModified ? new Date(file.lastModified) : new Date(0),
        isDirectory: false,
      });
    }

    cursor = page.cursor;
  } while (cursor);

  return [...directories, ...fileInfos].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function uploadFile(params: {
  filePath: string;
  fileData: Buffer | string;
  contentType?: string;
  metadata?: Record<string, string>;
}): Promise<{ filePath: string }> {
  if (!params.filePath) {
    throw Boom.badRequest("File path is required");
  }

  const result = await files.upload(params.filePath, params.fileData, {
    contentType: params.contentType,
    metadata: params.metadata,
  });

  return { filePath: result.key };
}

export async function bulkUpload(params: {
  files: Array<{ filePath: string; fileData: Buffer; contentType?: string }>;
}): Promise<{
  uploadedFiles: string[];
  failedFiles: Array<{ filePath: string; error: string }>;
}> {
  const result = await files.upload(
    params.files.map((file) => ({
      key: file.filePath,
      body: file.fileData,
      contentType: file.contentType,
    })),
    { concurrency: 5 },
  );

  return {
    uploadedFiles: result.uploaded.map((u) => u.key),
    failedFiles: (result.errors ?? []).map((e) => ({
      filePath: e.key,
      error: e.error.message,
    })),
  };
}

export async function downloadFile(params: { filePath: string }): Promise<{
  buffer: Buffer;
  contentType?: string;
  fileName: string;
}> {
  const exists = await files.exists(params.filePath);
  if (!exists) {
    throw Boom.notFound(`File not found: ${params.filePath}`);
  }

  const file = await files.download(params.filePath);
  const arrayBuffer = await file.arrayBuffer();
  const fileName = params.filePath.split("/").pop() ?? "file";

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: file.type || getContentType(fileName),
    fileName,
  };
}

export async function deleteFiles(params: {
  filePaths: string[];
}): Promise<{ deletedCount: number }> {
  if (!params.filePaths.length) {
    throw Boom.badRequest("No files specified for deletion");
  }
  const result = await files.delete(params.filePaths);
  return { deletedCount: result.deleted.length };
}

export async function getFileMetadata(params: { filePath: string }): Promise<{
  exists: boolean;
  size?: number;
  lastModified?: Date;
  fileName: string;
}> {
  const fileName = params.filePath.split("/").pop() ?? params.filePath;

  try {
    const file = await files.head(params.filePath);
    return {
      exists: true,
      size: file.size,
      lastModified: file.lastModified ? new Date(file.lastModified) : undefined,
      fileName,
    };
  } catch (error) {
    if (error instanceof FilesError && error.code === "NotFound") {
      return { exists: false, fileName };
    }
    throw error;
  }
}

export async function createFolder({
  folderPath,
}: {
  folderPath: string;
}): Promise<{ folderPath: string }> {
  if (!folderPath.endsWith("/")) {
    throw Boom.badRequest("Folder path must end with /");
  }
  await files.upload(`${folderPath}.keep`, "", {
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

  // Delete in fixed-size batches as the listing streams in, so a large prefix
  // never holds its full key set in memory. 1000 mirrors S3's DeleteObjects cap;
  // files-sdk would chunk a bigger array anyway, but this bounds peak memory to
  // one batch.
  const BATCH_SIZE = 1000;
  let deletedCount = 0;
  const batch: string[] = [];

  const flush = async () => {
    if (!batch.length) return;
    const result = await files.delete(batch);
    deletedCount += result.deleted.length;
    batch.length = 0;
  };

  for await (const file of files.listAll({ prefix: folderPath })) {
    batch.push(file.key);
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();

  return { deletedCount };
}

export async function renameFile(params: {
  oldPath: string;
  newPath: string;
}): Promise<{ newPath: string }> {
  const exists = await files.exists(params.oldPath);
  if (!exists) {
    throw Boom.notFound(`Source file not found: ${params.oldPath}`);
  }

  await files.move(params.oldPath, params.newPath);

  return { newPath: params.newPath };
}
