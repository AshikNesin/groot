import { Router } from "express";
import * as appSettingsController from "./app-settings.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import { upsertAppSettingSchema } from "@/shared/settings/app-settings.validation";
import { adminAuthMiddleware } from "@/core/middlewares/admin-auth.middleware";

const router = Router();

router.get("/", appSettingsController.getAll);
router.get("/:key", appSettingsController.getByKey);
router.put("/:key", validate(upsertAppSettingSchema), appSettingsController.upsert);
router.delete("/:key", adminAuthMiddleware, appSettingsController.deleteSetting);

export default router;
