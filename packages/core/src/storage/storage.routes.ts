import { createRouter } from "@groot/core/utils/router.utils";
import multer from "multer";
import * as storageController from "./storage.controller";
import {
  storageRateLimiter,
  uploadRateLimiter,
} from "@groot/core/middlewares/rate-limit.middleware";

const router = createRouter();

router.use(storageRateLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

router.get("/files", storageController.listFiles);

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

router.get("/files/download", storageController.downloadFile);

router.delete("/files", storageController.deleteFiles);

router.get("/files/metadata", storageController.getFileMetadata);

router.post("/folders", storageController.createFolder);

router.delete("/folders/:folderPath", storageController.deleteFolder);

router.put("/files/rename", storageController.renameFile);

export default router;
