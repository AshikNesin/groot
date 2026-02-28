import { prisma } from "@/core/database";
import type { Passkey } from "@/generated/prisma/models";

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

/**
 * Create a new passkey
 */
export const create = async (data: CreatePasskeyData): Promise<Passkey> => {
  return prisma.passkey.create({
    data,
  });
};

/**
 * Find passkey by credential ID
 */
export const findByCredentialId = async (
  credentialId: string,
): Promise<Passkey | null> => {
  return prisma.passkey.findUnique({
    where: { credentialId },
  });
};

/**
 * Find passkey by ID
 */
export const findById = async (id: number): Promise<Passkey | null> => {
  return prisma.passkey.findUnique({
    where: { id },
  });
};

/**
 * Find all passkeys for a user
 */
export const findByUserId = async (userId: number): Promise<Passkey[]> => {
  return prisma.passkey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Update passkey (typically counter and lastUsedAt after authentication)
 */
export const update = async (
  id: number,
  data: UpdatePasskeyData,
): Promise<Passkey> => {
  return prisma.passkey.update({
    where: { id },
    data,
  });
};

/**
 * Delete a passkey
 */
export const deletePasskey = async (id: number): Promise<Passkey> => {
  return prisma.passkey.delete({
    where: { id },
  });
};

/**
 * Count passkeys for a user
 */
export const countByUserId = async (userId: number): Promise<number> => {
  return prisma.passkey.count({
    where: { userId },
  });
};

/**
 * Find passkey by ID and user ID (for authorization checks)
 */
export const findByIdAndUserId = async (
  id: number,
  userId: number,
): Promise<Passkey | null> => {
  return prisma.passkey.findFirst({
    where: {
      id,
      userId,
    },
  });
};
