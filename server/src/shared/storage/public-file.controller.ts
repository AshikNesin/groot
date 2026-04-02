import type { Request, Response } from "express";
import { BaseController } from "@/core/base-controller";
import { publicShareService } from "@/shared/storage/public-share.service";
import { Boom, ErrorCodeEnum } from "@/core/errors";
import type { VerifySharePasswordDTO } from "@/shared/storage/storage.validation";

export class PublicFileController extends BaseController {
  async servePublicFile(req: Request, res: Response) {
    const { shareId } = req.params;
    if (!shareId) {
      throw Boom.badRequest("Share ID is required");
    }

    const file = await publicShareService.getShareFileContent(shareId);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${file.fileName}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(file.buffer);
  }

  async getPublicShareInfo(req: Request, res: Response) {
    const { shareId } = req.params;
    if (!shareId) {
      throw Boom.badRequest("Share ID is required");
    }

    const validation = await publicShareService.validateShareAccess(shareId);

    if (!validation.isValid) {
      throw Boom.forbidden(validation.reason ?? undefined, null, ErrorCodeEnum.SHARE_ACCESS_DENIED);
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

  async verifySharePassword(req: Request, res: Response) {
    const { shareId } = req.params;
    const body: VerifySharePasswordDTO = req.validated?.body ?? req.body;

    if (!shareId) {
      throw Boom.badRequest("Share ID is required");
    }

    const isValid = await publicShareService.verifySharePassword(shareId, body.password);

    res.json({
      success: true,
      data: { isValid },
    });
  }
}

export const publicFileController = new PublicFileController();
