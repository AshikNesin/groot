import { Router } from "express";
import multer from "multer";
import * as storageController from "./storage.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import {
  listFilesSchema,
  downloadFileSchema,
  deleteFilesSchema,
  getFileMetadataSchema,
  createFolderSchema,
  renameFileSchema,
  createPublicShareSchema,
  listSharesForFileSchema,
} from "@/shared/storage/storage.validation";
import { storageRateLimiter, uploadRateLimiter } from "@/core/middlewares/rate-limit.middleware";
import { handle } from "@/core/middlewares/route-handler.middleware";

const router = Router();

router.use(storageRateLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

router.get("/files", validate(listFilesSchema, "query"), handle(storageController.listFiles));

router.post(
  "/files/upload",
  uploadRateLimiter,
  upload.single("file"),
  handle(storageController.uploadFile),
);

router.post(
  "/files/bulk-upload",
  uploadRateLimiter,
  upload.array("files", 50),
  handle(storageController.bulkUpload),
);

router.get(
  "/files/download",
  validate(downloadFileSchema, "query"),
  handle(storageController.downloadFile),
);

router.delete("/files", validate(deleteFilesSchema), handle(storageController.deleteFiles));

router.get(
  "/files/metadata",
  validate(getFileMetadataSchema, "query"),
  handle(storageController.getFileMetadata),
);

router.post("/folders", validate(createFolderSchema), handle(storageController.createFolder));

router.delete("/folders/:folderPath", handle(storageController.deleteFolder));

router.put("/files/rename", validate(renameFileSchema), handle(storageController.renameFile));

router.post("/shares", validate(createPublicShareSchema), handle(storageController.createPublicShare));

router.get(
  "/shares",
  validate(listSharesForFileSchema, "query"),
  handle(storageController.listSharesForFile),
);

router.delete("/shares/:shareId", handle(storageController.revokeShare as any));

export default router;
