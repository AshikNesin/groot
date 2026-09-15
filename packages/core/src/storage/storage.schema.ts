import { z } from "zod";

export const listFilesSchema = z.object({
  prefix: z.string().optional(),
  delimiter: z.string().optional().default("/"),
});

export const downloadFileSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
});

export const deleteFilesSchema = z.object({
  filePaths: z.array(z.string().min(1)).min(1, "At least one file path is required"),
});

export const getFileMetadataSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
});

export const createFolderSchema = z.object({
  folderPath: z
    .string()
    .min(1, "Folder path is required")
    .regex(/\/$/, "Folder path must end with /"),
});

export const renameFileSchema = z.object({
  oldPath: z.string().min(1, "Old file path is required"),
  newPath: z.string().min(1, "New file path is required"),
});
