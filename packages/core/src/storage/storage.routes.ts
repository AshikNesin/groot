import type { Request, Response } from "express";
import { createRouter } from "@groot/core/utils/router.utils";
import multer from "multer";
import {
  storageRateLimiter,
  uploadRateLimiter,
} from "@groot/core/middlewares/rate-limit.middleware";
import { Boom } from "@groot/core/errors";
import { parseBody, parseQuery } from "@groot/core/utils/controller.utils";
import * as storageService from "./storage.service";
import {
  listFilesSchema,
  downloadFileSchema,
  deleteFilesSchema,
  getFileMetadataSchema,
  createFolderSchema,
  renameFileSchema,
} from "./storage.validation";
import { sanitizeFileName } from "./storage.utils";

const router = createRouter();

router.use(storageRateLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

router.get("/files", async (req: Request) => {
  const query = parseQuery(req, listFilesSchema);
  return await storageService.listFiles({
    prefix: query.prefix,
    delimiter: query.delimiter,
  });
});

router.post("/files/upload", uploadRateLimiter, upload.single("file"), async (req: Request) => {
  const file = req.file;
  const body = req.body;

  if (!file) {
    throw Boom.badRequest("No file uploaded");
  }

  const path = body?.filePath ?? file.originalname;
  return await storageService.uploadFile({
    filePath: path,
    fileData: file.buffer,
    contentType: body?.contentType ?? file.mimetype,
  });
});

router.post(
  "/files/bulk-upload",
  uploadRateLimiter,
  upload.array("files", 50),
  async (req: Request) => {
    const files = req.files as Express.Multer.File[];

    if (!files || !files.length) {
      throw Boom.badRequest("No files uploaded");
    }

    const payload = files.map((file) => ({
      filePath: file.originalname,
      fileData: file.buffer,
      contentType: file.mimetype,
    }));

    return await storageService.bulkUpload({ files: payload });
  },
);

router.get("/files/download", async (req: Request, res: Response) => {
  const query = parseQuery(req, downloadFileSchema);
  const file = await storageService.downloadFile({
    filePath: query.filePath,
  });

  res.setHeader("Content-Type", file.contentType ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; ${sanitizeFileName(file.fileName)}`);
  res.send(file.buffer);
});

router.delete("/files", async (req: Request) => {
  const body = parseBody(req, deleteFilesSchema);
  return await storageService.deleteFiles({
    filePaths: body.filePaths,
  });
});

router.get("/files/metadata", async (req: Request) => {
  const query = parseQuery(req, getFileMetadataSchema);
  return await storageService.getFileMetadata({
    filePath: query.filePath,
  });
});

router.post("/folders", async (req: Request) => {
  const body = parseBody(req, createFolderSchema);
  return await storageService.createFolder({ folderPath: body.folderPath });
});

router.delete("/folders/:folderPath", async (req: Request<{ folderPath?: string }>) => {
  const { folderPath } = req.params;
  if (!folderPath) {
    throw Boom.badRequest("Folder path is required");
  }
  const normalized = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;
  return await storageService.deleteFolder({ folderPath: normalized });
});

router.put("/files/rename", async (req: Request) => {
  const body = parseBody(req, renameFileSchema);
  return await storageService.renameFile({
    oldPath: body.oldPath,
    newPath: body.newPath,
  });
});

export default router;
