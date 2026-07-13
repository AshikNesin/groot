import type { Request, Response } from "express";
import * as StorageFileService from "./storage.service";
import {
  listFilesSchema,
  downloadFileSchema,
  deleteFilesSchema,
  getFileMetadataSchema,
  createFolderSchema,
  renameFileSchema,
} from "./storage.validation";
import { Boom } from "@groot/core/errors";
import { parseBody, parseQuery } from "@groot/core/utils/controller.utils";
import { sanitizeFileName } from "./storage.utils";

export async function listFiles(req: Request) {
  const query = parseQuery(req, listFilesSchema);
  return await StorageFileService.listFiles({
    prefix: query.prefix,
    delimiter: query.delimiter,
  });
}

export async function uploadFile(req: Request) {
  const file = req.file;
  const body = req.body;

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
  const query = parseQuery(req, downloadFileSchema);
  const file = await StorageFileService.downloadFile({
    filePath: query.filePath,
  });

  res.setHeader("Content-Type", file.contentType ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; ${sanitizeFileName(file.fileName)}`);
  res.send(file.buffer);
}

export async function deleteFiles(req: Request) {
  const body = parseBody(req, deleteFilesSchema);
  return await StorageFileService.deleteFiles({
    filePaths: body.filePaths,
  });
}

export async function getFileMetadata(req: Request) {
  const query = parseQuery(req, getFileMetadataSchema);
  return await StorageFileService.getFileMetadata({
    filePath: query.filePath,
  });
}

export async function createFolder(req: Request) {
  const body = parseBody(req, createFolderSchema);
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
  const body = parseBody(req, renameFileSchema);
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
