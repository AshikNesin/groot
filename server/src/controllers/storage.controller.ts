import type { Request, Response } from "express";
import { BaseController } from "@/core/base-controller";
import { ResponseHandler } from "@/core/response-handler";
import { asyncHandler } from "@/core/async-handler";
import { storageFileService } from "@/services/storage.service";
import { publicShareService } from "@/services/public-share.service";
import type {
  ListFilesDTO,
  DownloadFileDTO,
  DeleteFilesDTO,
  GetFileMetadataDTO,
  CreateFolderDTO,
  RenameFileDTO,
  CreatePublicShareDTO,
  ListSharesForFileDTO,
} from "@/validations/storage.validation";
import { BadRequestError } from "@/core/errors/base.errors";

type Empty = Record<string, never>;

export class StorageController extends BaseController {
  listFiles = asyncHandler(
    async (req: Request<Empty, unknown, Empty, ListFilesDTO>, res: Response) => {
      const query = req.validated?.query ?? req.query;
      const files = await storageFileService.listFiles({
        prefix: query.prefix,
        delimiter: query.delimiter,
      });
      ResponseHandler.success(res, files);
    },
  );

  uploadFile = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    const body = req.validated?.body ?? req.body;

    if (!file) {
      throw new BadRequestError("No file uploaded");
    }

    const path = body?.filePath ?? file.originalname;
    const result = await storageFileService.uploadFile({
      filePath: path,
      fileData: file.buffer,
      contentType: body?.contentType ?? file.mimetype,
    });

    ResponseHandler.created(res, result, "File uploaded successfully");
  });

  downloadFile = asyncHandler(
    async (req: Request<Empty, unknown, Empty, DownloadFileDTO>, res: Response) => {
      const query = req.validated?.query ?? req.query;
      const file = await storageFileService.downloadFile({
        filePath: query.filePath,
      });

      res.setHeader("Content-Type", file.contentType ?? "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${file.fileName}"`);
      res.send(file.buffer);
    },
  );

  deleteFiles = asyncHandler(
    async (req: Request<Empty, unknown, DeleteFilesDTO>, res: Response) => {
      const body = req.validated?.body ?? req.body;
      const result = await storageFileService.deleteFiles({
        filePaths: body.filePaths,
      });
      ResponseHandler.success(res, result, "Files deleted successfully");
    },
  );

  getFileMetadata = asyncHandler(
    async (req: Request<Empty, unknown, Empty, GetFileMetadataDTO>, res: Response) => {
      const query = req.validated?.query ?? req.query;
      const metadata = await storageFileService.getFileMetadata({
        filePath: query.filePath,
      });
      ResponseHandler.success(res, metadata);
    },
  );

  createFolder = asyncHandler(
    async (req: Request<Empty, unknown, CreateFolderDTO>, res: Response) => {
      const body = req.validated?.body ?? req.body;
      const result = await storageFileService.createFolder(body.folderPath);
      ResponseHandler.created(res, result, "Folder created successfully");
    },
  );

  deleteFolder = asyncHandler(async (req: Request<{ folderPath?: string }>, res: Response) => {
    const { folderPath } = req.params;
    if (!folderPath) {
      throw new BadRequestError("Folder path is required");
    }
    const normalized = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;
    const result = await storageFileService.deleteFolder(normalized);
    ResponseHandler.success(res, result, "Folder deleted successfully");
  });

  renameFile = asyncHandler(async (req: Request<Empty, unknown, RenameFileDTO>, res: Response) => {
    const body = req.validated?.body ?? req.body;
    const result = await storageFileService.renameFile({
      oldPath: body.oldPath,
      newPath: body.newPath,
    });
    ResponseHandler.success(res, result, "File renamed successfully");
  });

  bulkUpload = asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];

    if (!files || !files.length) {
      throw new BadRequestError("No files uploaded");
    }

    if (files.length > 50) {
      throw new BadRequestError("Maximum 50 files per upload");
    }

    const payload = files.map((file) => ({
      filePath: file.originalname,
      fileData: file.buffer,
      contentType: file.mimetype,
    }));

    const result = await storageFileService.bulkUpload({ files: payload });
    ResponseHandler.created(res, result, "Files uploaded successfully");
  });

  createPublicShare = asyncHandler(
    async (req: Request<Empty, unknown, CreatePublicShareDTO>, res: Response) => {
      const body = req.validated?.body ?? req.body;
      const share = await publicShareService.createShare(body);
      ResponseHandler.created(res, share, "Public share link created successfully");
    },
  );

  listSharesForFile = asyncHandler(
    async (req: Request<Empty, unknown, Empty, ListSharesForFileDTO>, res: Response) => {
      const query = req.validated?.query ?? req.query;
      const shares = await publicShareService.listSharesForFile(query.filePath);
      ResponseHandler.success(res, shares);
    },
  );

  revokeShare = asyncHandler(async (req: Request<{ shareId: string }>, res: Response) => {
    const { shareId } = req.params;
    await publicShareService.revokeShare(shareId);
    ResponseHandler.success(res, null, "Share revoked successfully");
  });
}

export const storageController = new StorageController();
