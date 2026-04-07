import { createRouter } from "@/core/utils/router.utils";
import multer from "multer";
import * as storageController from "@/shared/storage/storage.controller";
import { validateBody, validateQuery } from "@/core/middlewares/validation.middleware";
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

const router = createRouter();

router.use(storageRateLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

router.get("/files", validateQuery(listFilesSchema), storageController.listFiles);

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

router.get("/files/download", validateQuery(downloadFileSchema), storageController.downloadFile);

router.delete("/files", validateBody(deleteFilesSchema), storageController.deleteFiles);

router.get(
  "/files/metadata",
  validateQuery(getFileMetadataSchema),
  storageController.getFileMetadata,
);

router.post("/folders", validateBody(createFolderSchema), storageController.createFolder);

router.delete("/folders/:folderPath", storageController.deleteFolder);

router.put("/files/rename", validateBody(renameFileSchema), storageController.renameFile);

router.post("/shares", validateBody(createPublicShareSchema), storageController.createPublicShare);

router.get("/shares", validateQuery(listSharesForFileSchema), storageController.listSharesForFile);

router.delete("/shares/:shareId", storageController.revokeShare);

export default router;
