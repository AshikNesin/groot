import { Router } from "express";
import { appSettingsController } from "@/controllers/app-settings.controller";
import { validate } from "@/middlewares/validation.middleware";
import { upsertAppSettingSchema } from "@/validations/app-settings.validation";

const router = Router();

router.get("/", appSettingsController.getAll);
router.get("/:key", appSettingsController.getByKey);
router.put("/:key", validate(upsertAppSettingSchema), appSettingsController.upsert);
router.delete("/:key", appSettingsController.delete);

export default router;
