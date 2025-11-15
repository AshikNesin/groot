import { Router } from "express";
import { publicFileController } from "@/controllers/public-file.controller";
import { publicFileRateLimiter } from "@/middlewares/rate-limit.middleware";
import { validate } from "@/middlewares/validation.middleware";
import { verifySharePasswordSchema } from "@/validations/storage.validation";

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
