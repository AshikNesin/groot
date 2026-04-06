import { Router } from "express";
import * as publicFileController from "./public-file.controller";
import { publicFileRateLimiter } from "@/core/middlewares/rate-limit.middleware";
import { validate } from "@/core/middlewares/validation.middleware";
import { verifySharePasswordSchema } from "@/shared/storage/storage.validation";
import { handle } from "@/core/middlewares/route-handler.middleware";

const router = Router();

router.use(publicFileRateLimiter);

router.get("/:shareId", handle(publicFileController.servePublicFile));
router.get("/:shareId/info", handle(publicFileController.getPublicShareInfo));
router.post(
  "/:shareId/verify-password",
  validate(verifySharePasswordSchema),
  handle(publicFileController.verifySharePassword),
);

export default router;
