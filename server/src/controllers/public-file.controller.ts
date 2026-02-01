import type { Request, Response } from "express";
import { BaseController } from "@/core/base-controller";
import { publicShareService } from "@/services/public-share.service";
import { BadRequestError } from "@/core/errors/base.errors";
import type { VerifySharePasswordDTO } from "@/validations/storage.validation";

export class PublicFileController extends BaseController {
  servePublicFile = async (req: Request, res: Response): Promise<void> => {
    const { shareId } = req.params;
    if (!shareId) {
      throw new BadRequestError("Share ID is required");
    }

    const file = await publicShareService.getShareFileContent(shareId);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${file.fileName}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(file.buffer);
  };

  getPublicShareInfo = async (req: Request, res: Response): Promise<void> => {
    const { shareId } = req.params;
    if (!shareId) {
      throw new BadRequestError("Share ID is required");
    }

    const validation = await publicShareService.validateShareAccess(shareId);

    if (!validation.isValid) {
      res.status(403).json({
        success: false,
        error: {
          code: "SHARE_ACCESS_DENIED",
          message: validation.reason ?? "Access denied",
        },
      });
      return;
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
  };

  verifySharePassword = async (req: Request, res: Response): Promise<void> => {
    const { shareId } = req.params;
    const body: VerifySharePasswordDTO = req.validated?.body ?? req.body;

    if (!shareId) {
      throw new BadRequestError("Share ID is required");
    }

    const isValid = await publicShareService.verifySharePassword(
      shareId,
      body.password,
    );

    res.json({
      success: true,
      data: { isValid },
    });
  };
}

export const publicFileController = new PublicFileController();
