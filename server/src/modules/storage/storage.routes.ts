import { Router } from "express";
import multer from "multer";
import { storageController } from "@/modules/storage/storage.controller";
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
} from "@/modules/storage/storage.validation";
import { storageRateLimiter, uploadRateLimiter } from "@/core/middlewares/rate-limit.middleware";

const router = Router();

router.use(storageRateLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

router.get("/files", validate(listFilesSchema, "query"), storageController.listFiles);

router.post(
  "/files/upload",
  uploadRateLimiter,
  upload.single("file"),
  storageController.uploadFile,
);

router.post(
  "/files/bulk-upload",
  uploadRateLimiter,
  upload.array("files", 50),
  storageController.bulkUpload,
);

router.get(
  "/files/download",
  validate(downloadFileSchema, "query"),
  storageController.downloadFile,
);

router.delete("/files", validate(deleteFilesSchema), storageController.deleteFiles);

router.get(
  "/files/metadata",
  validate(getFileMetadataSchema, "query"),
  storageController.getFileMetadata,
);

router.post("/folders", validate(createFolderSchema), storageController.createFolder);

router.delete("/folders/:folderPath", storageController.deleteFolder);

router.put("/files/rename", validate(renameFileSchema), storageController.renameFile);

router.post("/shares", validate(createPublicShareSchema), storageController.createPublicShare);

router.get(
  "/shares",
  validate(listSharesForFileSchema, "query"),
  storageController.listSharesForFile,
);

router.delete("/shares/:shareId", storageController.revokeShare);

export default router;
