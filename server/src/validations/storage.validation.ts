import { z } from "zod";

export const listFilesSchema = z.object({
  prefix: z.string().optional(),
  delimiter: z.string().optional().default("/"),
});
export type ListFilesDTO = z.infer<typeof listFilesSchema>;

export const downloadFileSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
});
export type DownloadFileDTO = z.infer<typeof downloadFileSchema>;

export const deleteFilesSchema = z.object({
  filePaths: z.array(z.string().min(1)).min(1, "At least one file path is required"),
});
export type DeleteFilesDTO = z.infer<typeof deleteFilesSchema>;

export const getFileMetadataSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
});
export type GetFileMetadataDTO = z.infer<typeof getFileMetadataSchema>;

export const createFolderSchema = z.object({
  folderPath: z
    .string()
    .min(1, "Folder path is required")
    .regex(/\/$/, "Folder path must end with /"),
});
export type CreateFolderDTO = z.infer<typeof createFolderSchema>;

export const renameFileSchema = z.object({
  oldPath: z.string().min(1, "Old file path is required"),
  newPath: z.string().min(1, "New file path is required"),
});
export type RenameFileDTO = z.infer<typeof renameFileSchema>;

export const createPublicShareSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  expiresInHours: z.number().int().positive().optional().default(24),
  maxAccessCount: z.number().int().positive().optional(),
  password: z.string().min(4).max(50).optional(),
});
export type CreatePublicShareDTO = z.infer<typeof createPublicShareSchema>;

export const listSharesForFileSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
});
export type ListSharesForFileDTO = z.infer<typeof listSharesForFileSchema>;

export const verifySharePasswordSchema = z.object({
  password: z.string().min(1, "Password is required"),
});
export type VerifySharePasswordDTO = z.infer<typeof verifySharePasswordSchema>;
