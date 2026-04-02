import { Router } from "express";
import { publicFileController } from "@/modules/storage/public-file.controller";
import { publicFileRateLimiter } from "@/core/middlewares/rate-limit.middleware";
import { validate } from "@/core/middlewares/validation.middleware";
import { verifySharePasswordSchema } from "@/modules/storage/storage.validation";

const router = Router();

router.use(publicFileRateLimiter);

router.get("/:shareId", publicFileController.servePublicFile);
router.get("/:shareId/info", publicFileController.getPublicShareInfo);
router.post(
  "/:shareId/verify-password",
  validate(verifySharePasswordSchema),
  publicFileController.verifySharePassword,
);

export default router;
