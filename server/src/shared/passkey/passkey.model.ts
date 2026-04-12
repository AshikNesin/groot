import { prisma } from "@/core/database";
import type { Passkey } from "@/generated/prisma";

export type CreatePasskeyData = {
  userId: number;
  credentialId: string;
  publicKey: Buffer;
  counter: bigint;
  deviceType?: string | null;
  backedUp: boolean;
  transports: string[];
  credentialName?: string | null;
};

export type UpdatePasskeyData = {
  counter?: bigint;
  lastUsedAt?: Date;
  credentialName?: string;
};

class PasskeyModel {
  async create(data: CreatePasskeyData): Promise<Passkey> {
    return prisma.passkey.create({
      data,
    });
  }

  async findByCredentialId(credentialId: string): Promise<Passkey | null> {
    return prisma.passkey.findUnique({
      where: { credentialId },
    });
  }

  async findById(id: number): Promise<Passkey | null> {
    return prisma.passkey.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: number): Promise<Passkey[]> {
    return prisma.passkey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: number, data: UpdatePasskeyData): Promise<Passkey> {
    return prisma.passkey.update({
      where: { id },
      data,
    });
  }

  async deletePasskey(id: number): Promise<Passkey> {
    return prisma.passkey.delete({
      where: { id },
    });
  }

  async countByUserId(userId: number): Promise<number> {
    return prisma.passkey.count({
      where: { userId },
    });
  }

  async findByIdAndUserId(id: number, userId: number): Promise<Passkey | null> {
    return prisma.passkey.findFirst({
      where: {
        id,
        userId,
      },
    });
  }
}

export const passkeyModel = new PasskeyModel();
