import type { Request, Response } from "express";
import { ResponseHandler } from "@/core/response-handler";
import * as SettingSystem from "./app-settings.service";

export async function getAll(_req: Request, res: Response) {
  const settings = await SettingSystem.getAll();
  ResponseHandler.success(res, settings);
}

export async function getByKey(req: Request, res: Response) {
  const { key } = req.params;
  const setting = await SettingSystem.get({ key });
  ResponseHandler.success(res, setting);
}

export async function upsert(req: Request, res: Response) {
  const { key } = req.params;
  const data = req.validated?.body || req.body;
  const setting = await SettingSystem.upsert({ key, data });
  ResponseHandler.success(res, setting, "Setting saved successfully");
}

export async function deleteSetting(req: Request, res: Response) {
  const { key } = req.params;
  await SettingSystem.deleteSetting({ key });
  ResponseHandler.success(res, null, "Setting deleted successfully");
}
