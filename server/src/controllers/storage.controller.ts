import type { Request, Response } from "express";
import { BaseController } from "@/core/base-controller";
import { ResponseHandler } from "@/core/response-handler";
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
import { Boom } from "@/core/errors";

export class StorageController extends BaseController {
  async listFiles(req: Request, res: Response) {
    const query = (req.validated?.query ?? req.query) as ListFilesDTO;
    const files = await storageFileService.listFiles({
      prefix: query.prefix,
      delimiter: query.delimiter,
    });
    ResponseHandler.success(res, files);
  }

  async uploadFile(req: Request, res: Response) {
    const file = req.file;
    const body = req.validated?.body ?? req.body;

    if (!file) {
      throw Boom.badRequest("No file uploaded");
    }

    const path = body?.filePath ?? file.originalname;
    const result = await storageFileService.uploadFile({
      filePath: path,
      fileData: file.buffer,
      contentType: body?.contentType ?? file.mimetype,
    });

    ResponseHandler.created(res, result, "File uploaded successfully");
  }

  async downloadFile(req: Request, res: Response) {
    const query = (req.validated?.query ?? req.query) as DownloadFileDTO;
    const file = await storageFileService.downloadFile({
      filePath: query.filePath,
    });

    res.setHeader("Content-Type", file.contentType ?? "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${file.fileName}"`);
    res.send(file.buffer);
  }

  async deleteFiles(req: Request, res: Response) {
    const body = (req.validated?.body ?? req.body) as DeleteFilesDTO;
    const result = await storageFileService.deleteFiles({
      filePaths: body.filePaths,
    });
    ResponseHandler.success(res, result, "Files deleted successfully");
  }

  async getFileMetadata(req: Request, res: Response) {
    const query = (req.validated?.query ?? req.query) as GetFileMetadataDTO;
    const metadata = await storageFileService.getFileMetadata({
      filePath: query.filePath,
    });
    ResponseHandler.success(res, metadata);
  }

  async createFolder(req: Request, res: Response) {
    const body = (req.validated?.body ?? req.body) as CreateFolderDTO;
    const result = await storageFileService.createFolder(body.folderPath);
    ResponseHandler.created(res, result, "Folder created successfully");
  }

  async deleteFolder(req: Request<{ folderPath?: string }>, res: Response) {
    const { folderPath } = req.params;
    if (!folderPath) {
      throw Boom.badRequest("Folder path is required");
    }
    const normalized = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;
    const result = await storageFileService.deleteFolder(normalized);
    ResponseHandler.success(res, result, "Folder deleted successfully");
  }

  async renameFile(req: Request, res: Response) {
    const body = (req.validated?.body ?? req.body) as RenameFileDTO;
    const result = await storageFileService.renameFile({
      oldPath: body.oldPath,
      newPath: body.newPath,
    });
    ResponseHandler.success(res, result, "File renamed successfully");
  }

  async bulkUpload(req: Request, res: Response) {
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

    const result = await storageFileService.bulkUpload({ files: payload });
    ResponseHandler.created(res, result, "Files uploaded successfully");
  }

  async createPublicShare(req: Request, res: Response) {
    const body = (req.validated?.body ?? req.body) as CreatePublicShareDTO;
    const share = await publicShareService.createShare(body);
    ResponseHandler.created(res, share, "Public share link created successfully");
  }

  async listSharesForFile(req: Request, res: Response) {
    const query = (req.validated?.query ?? req.query) as ListSharesForFileDTO;
    const shares = await publicShareService.listSharesForFile(query.filePath);
    ResponseHandler.success(res, shares);
  }

  async revokeShare(req: Request<{ shareId: string }>, res: Response) {
    const { shareId } = req.params;
    await publicShareService.revokeShare(shareId);
    ResponseHandler.success(res, null, "Share revoked successfully");
  }
}

export const storageController = new StorageController();
