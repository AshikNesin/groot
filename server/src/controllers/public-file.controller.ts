import type { Request, Response } from "express";
import { BaseController } from "@/core/base-controller";
import { asyncHandler } from "@/core/async-handler";
import { publicShareService } from "@/services/public-share.service";
import { ERROR_CODE } from "@/core/errors";
import type { VerifySharePasswordDTO } from "@/validations/storage.validation";

export class PublicFileController extends BaseController {
  servePublicFile = asyncHandler(async (req: Request, res: Response) => {
    const { shareId } = req.params;
    if (!shareId) {
      throw ERROR_CODE.BAD_REQUEST({ message: "Share ID is required" });
    }

    const file = await publicShareService.getShareFileContent(shareId);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${file.fileName}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(file.buffer);
  });

  getPublicShareInfo = asyncHandler(async (req: Request, res: Response) => {
    const { shareId } = req.params;
    if (!shareId) {
      throw ERROR_CODE.BAD_REQUEST({ message: "Share ID is required" });
    }

    const validation = await publicShareService.validateShareAccess(shareId);

    if (!validation.isValid) {
      throw ERROR_CODE.SHARE_ACCESS_DENIED({ message: validation.reason ?? undefined });
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
  });

  verifySharePassword = asyncHandler(async (req: Request, res: Response) => {
    const { shareId } = req.params;
    const body: VerifySharePasswordDTO = req.validated?.body ?? req.body;

    if (!shareId) {
      throw ERROR_CODE.BAD_REQUEST({ message: "Share ID is required" });
    }

    const isValid = await publicShareService.verifySharePassword(shareId, body.password);

    res.json({
      success: true,
      data: { isValid },
    });
  });
}

export const publicFileController = new PublicFileController();
