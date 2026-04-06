import type { Request, Response } from "express";
import { ResponseHandler } from "@/core/response-handler";
import * as StorageFileService from "./storage.service";
import * as PublicShareService from "./public-share.service";
import type {
  ListFilesDTO,
  DownloadFileDTO,
  DeleteFilesDTO,
  GetFileMetadataDTO,
  CreateFolderDTO,
  RenameFileDTO,
  CreatePublicShareDTO,
  ListSharesForFileDTO,
} from "./storage.validation";
import { Boom } from "@/core/errors";

export async function listFiles(req: Request, res: Response): Promise<void> {
  const query = (req.validated?.query ?? req.query) as ListFilesDTO;
  const files = await StorageFileService.listFiles({
    prefix: query.prefix,
    delimiter: query.delimiter,
  });
  ResponseHandler.success(res, files);
}

export async function uploadFile(req: Request, res: Response): Promise<void> {
  const file = req.file;
  const body = req.validated?.body ?? req.body;

  if (!file) {
    throw Boom.badRequest("No file uploaded");
  }

  const path = body?.filePath ?? file.originalname;
  const result = await StorageFileService.uploadFile({
    filePath: path,
    fileData: file.buffer,
    contentType: body?.contentType ?? file.mimetype,
  });

  ResponseHandler.created(res, result, "File uploaded successfully");
}

export async function downloadFile(req: Request, res: Response): Promise<void> {
  const query = (req.validated?.query ?? req.query) as DownloadFileDTO;
  const file = await StorageFileService.downloadFile({
    filePath: query.filePath,
  });

  res.setHeader("Content-Type", file.contentType ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${file.fileName}"`);
  res.send(file.buffer);
}

export async function deleteFiles(req: Request, res: Response): Promise<void> {
  const body = (req.validated?.body ?? req.body) as DeleteFilesDTO;
  const result = await StorageFileService.deleteFiles({
    filePaths: body.filePaths,
  });
  ResponseHandler.success(res, result, "Files deleted successfully");
}

export async function getFileMetadata(req: Request, res: Response): Promise<void> {
  const query = (req.validated?.query ?? req.query) as GetFileMetadataDTO;
  const metadata = await StorageFileService.getFileMetadata({
    filePath: query.filePath,
  });
  ResponseHandler.success(res, metadata);
}

export async function createFolder(req: Request, res: Response): Promise<void> {
  const body = (req.validated?.body ?? req.body) as CreateFolderDTO;
  const result = await StorageFileService.createFolder({ folderPath: body.folderPath });
  ResponseHandler.created(res, result, "Folder created successfully");
}

export async function deleteFolder(req: Request<{ folderPath?: string }>, res: Response): Promise<void> {
  const { folderPath } = req.params;
  if (!folderPath) {
    throw Boom.badRequest("Folder path is required");
  }
  const normalized = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;
  const result = await StorageFileService.deleteFolder({ folderPath: normalized });
  ResponseHandler.success(res, result, "Folder deleted successfully");
}

export async function renameFile(req: Request, res: Response): Promise<void> {
  const body = (req.validated?.body ?? req.body) as RenameFileDTO;
  const result = await StorageFileService.renameFile({
    oldPath: body.oldPath,
    newPath: body.newPath,
  });
  ResponseHandler.success(res, result, "File renamed successfully");
}

export async function bulkUpload(req: Request, res: Response): Promise<void> {
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

  const result = await StorageFileService.bulkUpload({ files: payload });
  ResponseHandler.created(res, result, "Files uploaded successfully");
}

export async function createPublicShare(req: Request, res: Response): Promise<void> {
  const body = (req.validated?.body ?? req.body) as CreatePublicShareDTO;
  const share = await PublicShareService.createShare(body);
  ResponseHandler.created(res, share, "Public share link created successfully");
}

export async function listSharesForFile(req: Request, res: Response): Promise<void> {
  const query = (req.validated?.query ?? req.query) as ListSharesForFileDTO;
  const shares = await PublicShareService.listSharesForFile({ filePath: query.filePath });
  ResponseHandler.success(res, shares);
}

export async function revokeShare(req: Request<{ shareId: string }>, res: Response): Promise<void> {
  const { shareId } = req.params;
  await PublicShareService.revokeShare({ shareId });
  ResponseHandler.success(res, null, "Share revoked successfully");
}
