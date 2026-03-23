import type { Request, Response } from "express";
import { BaseController } from "@/core/base-controller";
import { ResponseHandler } from "@/core/response-handler";
import { appSettingsService } from "@/services/app-settings.service";

class AppSettingsController extends BaseController {
  async getAll(_req: Request, res: Response) {
    const settings = await appSettingsService.getAll();
    ResponseHandler.success(res, settings);
  }

  async getByKey(req: Request, res: Response) {
    const { key } = req.params;
    const setting = await appSettingsService.get(key);
    ResponseHandler.success(res, setting);
  }

  async upsert(req: Request, res: Response) {
    const { key } = req.params;
    const data = req.validated?.body || req.body;
    const setting = await appSettingsService.upsert(key, data);
    ResponseHandler.success(res, setting, "Setting saved successfully");
  }

  async delete(req: Request, res: Response) {
    const { key } = req.params;
    await appSettingsService.delete(key);
    ResponseHandler.success(res, null, "Setting deleted successfully");
  }
}

export const appSettingsController = new AppSettingsController();
