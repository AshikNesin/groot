import { createRouter } from "@groot/core/utils/router.utils";
import * as appSettingsController from "./app-settings.controller";
import { adminAuthMiddleware } from "@groot/core/middlewares/admin-auth.middleware";

const router = createRouter();

router.get("/", appSettingsController.getAll);
router.get("/:key", appSettingsController.getByKey);
router.put("/:key", adminAuthMiddleware, appSettingsController.upsert);
router.delete("/:key", adminAuthMiddleware, appSettingsController.deleteSetting);

export default router;
