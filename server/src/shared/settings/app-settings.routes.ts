import { Router } from "express";
import * as appSettingsController from "./app-settings.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import { upsertAppSettingSchema } from "@/shared/settings/app-settings.validation";
import { adminAuthMiddleware } from "@/core/middlewares/admin-auth.middleware";
import { handle } from "@/core/middlewares/route-handler.middleware";

const router = Router();

router.get("/", handle(appSettingsController.getAll));
router.get("/:key", handle(appSettingsController.getByKey));
router.put("/:key", validate(upsertAppSettingSchema), handle(appSettingsController.upsert));
router.delete("/:key", adminAuthMiddleware, handle(appSettingsController.deleteSetting));

export default router;
