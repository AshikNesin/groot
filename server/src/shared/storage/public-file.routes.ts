import { createRouter } from "@/core/utils/router.utils";
import * as publicFileController from "@/shared/storage/public-file.controller";
import { publicFileRateLimiter } from "@/core/middlewares/rate-limit.middleware";
import { validate } from "@/core/middlewares/validation.middleware";
import { verifySharePasswordSchema } from "@/shared/storage/storage.validation";

const router = createRouter();

router.use(publicFileRateLimiter);

router.get("/:shareId", publicFileController.servePublicFile);
router.get("/:shareId/info", publicFileController.getPublicShareInfo);
router.post(
  "/:shareId/verify-password",
  validate(verifySharePasswordSchema),
  publicFileController.verifySharePassword,
);

export default router;
