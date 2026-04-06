import type { Request, Response } from "express";
import * as StorageFileService from "@/shared/storage/storage.service";
import * as PublicShareService from "@/shared/storage/public-share.service";
import type {
  ListFilesDTO,
  DownloadFileDTO,
  DeleteFilesDTO,
  GetFileMetadataDTO,
  CreateFolderDTO,
  RenameFileDTO,
  CreatePublicShareDTO,
  ListSharesForFileDTO,
} from "@/shared/storage/storage.validation";
import { Boom } from "@/core/errors";

export async function listFiles(req: Request) {
  const query = (req.validated?.query ?? req.query) as ListFilesDTO;
  return await StorageFileService.listFiles({
    prefix: query.prefix,
    delimiter: query.delimiter,
  });
}

export async function uploadFile(req: Request) {
  const file = req.file;
  const body = req.validated?.body ?? req.body;

  if (!file) {
    throw Boom.badRequest("No file uploaded");
  }

  const path = body?.filePath ?? file.originalname;
  return await StorageFileService.uploadFile({
    filePath: path,
    fileData: file.buffer,
    contentType: body?.contentType ?? file.mimetype,
  });
}

export async function downloadFile(req: Request, res: Response) {
  const query = (req.validated?.query ?? req.query) as DownloadFileDTO;
  const file = await StorageFileService.downloadFile({
    filePath: query.filePath,
  });

  res.setHeader("Content-Type", file.contentType ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${file.fileName}"`);
  res.send(file.buffer);
}

export async function deleteFiles(req: Request) {
  const body = (req.validated?.body ?? req.body) as DeleteFilesDTO;
  return await StorageFileService.deleteFiles({
    filePaths: body.filePaths,
  });
}

export async function getFileMetadata(req: Request) {
  const query = (req.validated?.query ?? req.query) as GetFileMetadataDTO;
  return await StorageFileService.getFileMetadata({
    filePath: query.filePath,
  });
}

export async function createFolder(req: Request) {
  const body = (req.validated?.body ?? req.body) as CreateFolderDTO;
  return await StorageFileService.createFolder({ folderPath: body.folderPath });
}

export async function deleteFolder(req: Request<{ folderPath?: string }>) {
  const { folderPath } = req.params;
  if (!folderPath) {
    throw Boom.badRequest("Folder path is required");
  }
  const normalized = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;
  return await StorageFileService.deleteFolder({ folderPath: normalized });
}

export async function renameFile(req: Request) {
  const body = (req.validated?.body ?? req.body) as RenameFileDTO;
  return await StorageFileService.renameFile({
    oldPath: body.oldPath,
    newPath: body.newPath,
  });
}

export async function bulkUpload(req: Request) {
  const files = req.files as Express.Multer.File[];

  if (!files || !files.length) {
    throw Boom.badRequest("No files uploaded");
  }

  if (files.length > 50) {
    throw Boom.badRequest("Maximum 50 files per upload");
  }

  const payload = files.map((file) => ({
    filePath: file.originalname,
    fileData: file.buffer,
    contentType: file.mimetype,
  }));

  return await StorageFileService.bulkUpload({ files: payload });
}

export async function createPublicShare(req: Request) {
  const body = (req.validated?.body ?? req.body) as CreatePublicShareDTO;
  return await PublicShareService.createShare(body);
}

export async function listSharesForFile(req: Request) {
  const query = (req.validated?.query ?? req.query) as ListSharesForFileDTO;
  return await PublicShareService.listSharesForFile({ filePath: query.filePath });
}

export async function revokeShare(req: Request<{ shareId: string }>) {
  const { shareId } = req.params;
  await PublicShareService.revokeShare({ shareId });
}
