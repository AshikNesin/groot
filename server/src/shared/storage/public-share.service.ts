import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import { prisma } from "@/core/database";
import * as StorageFileService from "@/shared/storage/storage.service";
import { Boom, HttpError } from "@/core/errors";
import { env } from "@/core/env";
import { getContentType } from "@/shared/storage/storage.utils";

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

export async function createShare(params: CreatePublicShareParams): Promise<PublicShareInfo> {
  const { filePath, expiresInHours = 24, maxAccessCount, password } = params;
  const metadata = await StorageFileService.getFileMetadata({ filePath });

  if (!metadata.exists) {
    throw Boom.notFound(`File not found: ${filePath}`);
  }

  const expiresAt = dayjs().add(expiresInHours, "hour").toDate();

  const passwordHash = password ? await bcrypt.hash(password, 10) : null;
  const contentType = getContentType(metadata.fileName);

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

  return formatShare(share);
}

export async function listSharesForFile({
  filePath,
}: {
  filePath: string;
}): Promise<PublicShareInfo[]> {
  const shares = await prisma.publicFileShare.findMany({
    where: {
      filePath,
      bucketName: env.AWS_DEFAULT_S3_BUCKET,
      isDeleted: false,
    },
    orderBy: { createdAt: "desc" },
  });
  return shares.map(formatShare);
}

export async function revokeShare({ shareId }: { shareId: string }): Promise<void> {
  const share = await prisma.publicFileShare.findUnique({
    where: { shareId },
  });

  if (!share) {
    throw Boom.notFound("Share not found");
  }

  await prisma.publicFileShare.update({
    where: { shareId },
    data: { isDeleted: true },
  });
}

export async function verifySharePassword({
  shareId,
  password,
}: {
  shareId: string;
  password: string;
}): Promise<boolean> {
  const share = await prisma.publicFileShare.findUnique({
    where: { shareId, isDeleted: false },
  });

  if (!share) {
    throw Boom.notFound("Share not found or has been deleted");
  }

  if (!share.passwordHash) {
    return true;
  }

  return bcrypt.compare(password, share.passwordHash);
}

export async function getShareFileContent({
  shareId,
}: {
  shareId: string;
}): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
  const validation = await validateShareAccess({ shareId });
  if (!validation.isValid || !validation.share) {
    throw Boom.badRequest(validation.reason ?? "Share is not accessible");
  }

  const file = await StorageFileService.downloadFile({
    filePath: validation.share.filePath,
  });
  await incrementAccessCount({ shareId });

  return {
    buffer: file.buffer,
    contentType: validation.share.contentType ?? file.contentType ?? "application/octet-stream",
    fileName: validation.share.fileName,
  };
}

export async function getShareByShareId({
  shareId,
}: {
  shareId: string;
}): Promise<PublicShareInfo> {
  const share = await prisma.publicFileShare.findUnique({
    where: { shareId, isDeleted: false },
  });

  if (!share) {
    throw Boom.notFound("Share not found");
  }

  return formatShare(share);
}

export async function validateShareAccess({
  shareId,
}: {
  shareId: string;
}): Promise<{ isValid: boolean; share?: PublicShareInfo; reason?: string }> {
  try {
    const share = await getShareByShareId({ shareId });

    if (share.isExpired) {
      return { isValid: false, reason: "This share link has expired" };
    }

    if (share.isAccessLimitReached) {
      return {
        isValid: false,
        reason: "This share link has reached its access limit",
      };
    }

    return { isValid: true, share };
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        isValid: false,
        reason: "Share not found or has been deleted",
      };
    }
    throw error;
  }
}

export async function incrementAccessCount({ shareId }: { shareId: string }): Promise<void> {
  await prisma.publicFileShare.update({
    where: { shareId },
    data: {
      accessCount: {
        increment: 1,
      },
    },
  });
}

export async function cleanupExpiredShares(): Promise<number> {
  const result = await prisma.publicFileShare.updateMany({
    where: {
      expiresAt: {
        lt: dayjs().toDate(),
      },
      isDeleted: false,
    },
    data: {
      isDeleted: true,
    },
  });
  return result.count;
}

function formatShare(
  share: Awaited<ReturnType<typeof prisma.publicFileShare.create>>,
): PublicShareInfo {
  const isExpired = dayjs(share.expiresAt).isBefore(dayjs());
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
