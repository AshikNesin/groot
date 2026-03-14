import { describe, expect, it, beforeEach, vi } from "vite-plus/test";

const { mockPrisma, mockStorageService } = vi.hoisted(() => {
  const prismaMock = {
    publicFileShare: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  const storageMock = {
    getFileMetadata: vi.fn(),
    downloadFile: vi.fn(),
  };

  return { mockPrisma: prismaMock, mockStorageService: storageMock };
});

vi.mock("@/core/database", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/services/storage.service", () => ({
  storageFileService: mockStorageService,
}));

import { publicShareService } from "@/services/public-share.service";

const baseShare = {
  id: 1,
  shareId: "11111111-2222-3333-4444-555555555555",
  bucketName: "local-bucket",
  filePath: "docs/file.pdf",
  fileName: "file.pdf",
  contentType: "application/pdf",
  fileSize: 1024,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  accessCount: 0,
  maxAccessCount: null,
  passwordHash: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeleted: false,
};

describe("PublicShareService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageService.getFileMetadata.mockResolvedValue({
      exists: true,
      fileName: "file.pdf",
      size: 1024,
    });
  });

  it("creates share with hashed password", async () => {
    mockPrisma.publicFileShare.create.mockImplementation(async ({ data }) => {
      expect(typeof data.passwordHash).toBe("string");
      return { ...baseShare, passwordHash: data.passwordHash };
    });

    const share = await publicShareService.createShare({
      filePath: "docs/file.pdf",
      password: "secret",
      expiresInHours: 12,
    });

    expect(share.isPasswordProtected).toBe(true);
    expect(mockPrisma.publicFileShare.create).toHaveBeenCalledTimes(1);
  });

  it("detects expired shares", async () => {
    mockPrisma.publicFileShare.findUnique.mockResolvedValue({
      ...baseShare,
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await publicShareService.validateShareAccess(baseShare.shareId);

    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/expired/i);
  });

  it("streams shared file and increments access count", async () => {
    mockPrisma.publicFileShare.findUnique.mockResolvedValue(baseShare);
    mockStorageService.downloadFile.mockResolvedValue({
      buffer: Buffer.from("hello"),
      contentType: "application/pdf",
      fileName: "file.pdf",
    });

    const result = await publicShareService.getShareFileContent(baseShare.shareId);

    expect(result.buffer.toString()).toBe("hello");
    expect(mockPrisma.publicFileShare.update).toHaveBeenCalledWith({
      where: { shareId: baseShare.shareId },
      data: { accessCount: { increment: 1 } },
    });
  });
});
