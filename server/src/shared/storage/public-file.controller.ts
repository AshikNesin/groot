import type { Request, Response } from "express";
import * as PublicShareService from "./public-share.service";
import { Boom, ErrorCode } from "@/core/errors";
import type { VerifySharePasswordDTO } from "./storage.validation";

export async function servePublicFile(req: Request, res: Response): Promise<void> {
  const { shareId } = req.params;
  if (!shareId) {
    throw Boom.badRequest("Share ID is required");
  }

  const file = await PublicShareService.getShareFileContent({ shareId });
  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Content-Disposition", `inline; filename="${file.fileName}"`);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.send(file.buffer);
}

export async function getPublicShareInfo(req: Request, res: Response): Promise<void> {
  const { shareId } = req.params;
  if (!shareId) {
    throw Boom.badRequest("Share ID is required");
  }

  const validation = await PublicShareService.validateShareAccess({ shareId });

  if (!validation.isValid) {
    throw Boom.forbidden(
      validation.reason ?? undefined,
      null,
      ErrorCode.SHARE_ACCESS_DENIED.code,
    );
  }

  res.json({
    success: true,
    data: {
      fileName: validation.share?.fileName,
      fileSize: validation.share?.fileSize,
      contentType: validation.share?.contentType,
      expiresAt: validation.share?.expiresAt,
      isExpired: validation.share?.isExpired,
      isPasswordProtected: validation.share?.isPasswordProtected,
    },
  });
}

export async function verifySharePassword(req: Request, res: Response): Promise<void> {
  const { shareId } = req.params;
  const body: VerifySharePasswordDTO = req.validated?.body ?? req.body;

  if (!shareId) {
    throw Boom.badRequest("Share ID is required");
  }

  const isValid = await PublicShareService.verifySharePassword({ shareId, password: body.password });

  res.json({
    success: true,
    data: { isValid },
  });
}
