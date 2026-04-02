import { Router } from "express";
import { appSettingsController } from "@/shared/settings/app-settings.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import { upsertAppSettingSchema } from "@/shared/settings/app-settings.validation";

const router = Router();

router.get("/", appSettingsController.getAll);
router.get("/:key", appSettingsController.getByKey);
router.put("/:key", validate(upsertAppSettingSchema), appSettingsController.upsert);
router.delete("/:key", appSettingsController.delete);

export default router;
