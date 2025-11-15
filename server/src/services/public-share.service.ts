import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/core/database";
import { storageFileService } from "@/services/storage.service";
import { BadRequestError, NotFoundError } from "@/core/errors/base.errors";
import { env } from "@/env";

export interface CreatePublicShareParams {
  filePath: string;
  expiresInHours?: number;
  maxAccessCount?: number;
  password?: string;
}

export interface PublicShareInfo {
  id: number;
  shareId: string;
  bucketName: string;
  filePath: string;
  fileName: string;
  contentType: string | null;
  fileSize: number | null;
  expiresAt: Date;
  accessCount: number;
  maxAccessCount: number | null;
  isPasswordProtected: boolean;
  createdAt: Date;
  isExpired: boolean;
  isAccessLimitReached: boolean;
}

export class PublicShareService {
  async createShare(params: CreatePublicShareParams): Promise<PublicShareInfo> {
    const { filePath, expiresInHours = 24, maxAccessCount, password } = params;
    const metadata = await storageFileService.getFileMetadata({ filePath });

    if (!metadata.exists) {
      throw new NotFoundError(`File not found: ${filePath}`);
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const contentType = this.inferContentType(metadata.fileName);

    const share = await prisma.publicFileShare.create({
      data: {
        shareId: randomUUID(),
        bucketName: env.AWS_DEFAULT_S3_BUCKET,
        filePath,
        fileName: metadata.fileName,
        contentType,
        fileSize: metadata.size ?? null,
        expiresAt,
        maxAccessCount,
        passwordHash,
      },
    });

    return this.formatShare(share);
  }

  async listSharesForFile(filePath: string): Promise<PublicShareInfo[]> {
    const shares = await prisma.publicFileShare.findMany({
      where: { filePath, bucketName: env.AWS_DEFAULT_S3_BUCKET, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });
    return shares.map((share) => this.formatShare(share));
  }

  async revokeShare(shareId: string): Promise<void> {
    const share = await prisma.publicFileShare.findUnique({
      where: { shareId },
    });

    if (!share) {
      throw new NotFoundError("Share not found");
    }

    await prisma.publicFileShare.update({
      where: { shareId },
      data: { isDeleted: true },
    });
  }

  async verifySharePassword(shareId: string, password: string): Promise<boolean> {
    const share = await prisma.publicFileShare.findUnique({
      where: { shareId, isDeleted: false },
    });

    if (!share) {
      throw new NotFoundError("Share not found or has been deleted");
    }

    if (!share.passwordHash) {
      return true;
    }

    return bcrypt.compare(password, share.passwordHash);
  }

  async getShareFileContent(shareId: string): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
    const validation = await this.validateShareAccess(shareId);
    if (!validation.isValid || !validation.share) {
      throw new BadRequestError(validation.reason ?? "Share is not accessible");
    }

    const file = await storageFileService.downloadFile({ filePath: validation.share.filePath });
    await this.incrementAccessCount(shareId);

    return {
      buffer: file.buffer,
      contentType: validation.share.contentType ?? file.contentType ?? "application/octet-stream",
      fileName: validation.share.fileName,
    };
  }

  async getShareByShareId(shareId: string): Promise<PublicShareInfo> {
    const share = await prisma.publicFileShare.findUnique({
      where: { shareId, isDeleted: false },
    });

    if (!share) {
      throw new NotFoundError("Share not found");
    }

    return this.formatShare(share);
  }

  async validateShareAccess(shareId: string): Promise<{ isValid: boolean; share?: PublicShareInfo; reason?: string }> {
    try {
      const share = await this.getShareByShareId(shareId);

      if (share.isExpired) {
        return { isValid: false, reason: "This share link has expired" };
      }

      if (share.isAccessLimitReached) {
        return { isValid: false, reason: "This share link has reached its access limit" };
      }

      return { isValid: true, share };
    } catch (error) {
      if (error instanceof NotFoundError) {
        return { isValid: false, reason: "Share not found or has been deleted" };
      }
      throw error;
    }
  }

  async incrementAccessCount(shareId: string): Promise<void> {
    await prisma.publicFileShare.update({
      where: { shareId },
      data: {
        accessCount: {
          increment: 1,
        },
      },
    });
  }

  async cleanupExpiredShares(): Promise<number> {
    const result = await prisma.publicFileShare.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });
    return result.count;
  }

  private formatShare(share: Awaited<ReturnType<typeof prisma.publicFileShare.create>>): PublicShareInfo {
    const now = new Date();
    const isExpired = share.expiresAt < now;
    const isAccessLimitReached =
      share.maxAccessCount !== null &&
      share.maxAccessCount !== undefined &&
      share.accessCount >= share.maxAccessCount;

    return {
      id: share.id,
      shareId: share.shareId,
      bucketName: share.bucketName,
      filePath: share.filePath,
      fileName: share.fileName,
      contentType: share.contentType,
      fileSize: share.fileSize,
      expiresAt: share.expiresAt,
      accessCount: share.accessCount,
      maxAccessCount: share.maxAccessCount,
      isPasswordProtected: Boolean(share.passwordHash),
      createdAt: share.createdAt,
      isExpired,
      isAccessLimitReached,
    };
  }

  private inferContentType(fileName: string): string {
    const extension = fileName.split(".").pop()?.toLowerCase();
    const map: Record<string, string> = {
      pdf: "application/pdf",
      json: "application/json",
      csv: "text/csv",
      txt: "text/plain",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      svg: "image/svg+xml",
      html: "text/html",
      xml: "application/xml",
    };
    if (!extension) {
      return "application/octet-stream";
    }
    return map[extension] ?? "application/octet-stream";
  }
}

export const publicShareService = new PublicShareService();
