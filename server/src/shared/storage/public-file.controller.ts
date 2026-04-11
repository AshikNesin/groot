import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import * as PublicShareService from "@/shared/storage/public-share.service";
import { Boom, ErrorCode } from "@/core/errors";
import { env } from "@/core/env";
import { sanitizeFileName } from "@/shared/storage/storage.utils";
import type { VerifySharePasswordDTO } from "@/shared/storage/storage.validation";

export async function servePublicFile(req: Request, res: Response) {
  const { shareId } = req.params;
  if (!shareId) {
    throw Boom.badRequest("Share ID is required");
  }

  const file = await PublicShareService.getShareFileContent({
    shareId,
    shareAccessToken: req.cookies?.share_token,
  });
  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Content-Disposition", `inline; ${sanitizeFileName(file.fileName)}`);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.send(file.buffer);
}

export async function getPublicShareInfo(req: Request) {
  const { shareId } = req.params;
  if (!shareId) {
    throw Boom.badRequest("Share ID is required");
  }

  const validation = await PublicShareService.validateShareAccess({ shareId });

  if (!validation.isValid) {
    throw Boom.forbidden(validation.reason ?? undefined, null, ErrorCode.SHARE_ACCESS_DENIED.code);
  }

  return {
    fileName: validation.share?.fileName,
    fileSize: validation.share?.fileSize,
    contentType: validation.share?.contentType,
    expiresAt: validation.share?.expiresAt,
    isExpired: validation.share?.isExpired,
    isPasswordProtected: validation.share?.isPasswordProtected,
  };
}

export async function verifySharePassword(req: Request, res: Response) {
  const { shareId } = req.params;
  const body: VerifySharePasswordDTO = req.body;

  if (!shareId) {
    throw Boom.badRequest("Share ID is required");
  }

  const isValid = await PublicShareService.verifySharePassword({
    shareId,
    password: body.password,
  });

  if (isValid) {
    const accessToken = jwt.sign({ shareId }, env.JWT_SECRET, { expiresIn: "1h" });
    res.cookie("share_token", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 3600000,
      path: `/api/v1/public/files/${shareId}`,
    });
  }

  return { isValid };
}
