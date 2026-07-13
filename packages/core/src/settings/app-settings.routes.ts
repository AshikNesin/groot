import type { Request } from "express";
import { createRouter } from "@groot/core/utils/router.utils";
import { adminAuthMiddleware } from "@groot/core/middlewares/admin-auth.middleware";
import { parseStringParam, parseBody } from "@groot/core/utils/controller.utils";
import * as AppSettingsService from "./app-settings.service";
import { upsertAppSettingSchema } from "./app-settings.validation";

const router = createRouter();

router.get("/", async () => {
  return await AppSettingsService.getAll();
});

router.get("/:key", async (req: Request) => {
  const key = parseStringParam(req.params.key, "key");
  return await AppSettingsService.get({ key });
});

router.put("/:key", adminAuthMiddleware, async (req: Request) => {
  const key = parseStringParam(req.params.key, "key");
  const payload = parseBody(req, upsertAppSettingSchema);
  return await AppSettingsService.upsert({ key, data: payload });
});

router.delete("/:key", adminAuthMiddleware, async (req: Request) => {
  const key = parseStringParam(req.params.key, "key");
  return await AppSettingsService.deleteSetting({ key });
});

export default router;
