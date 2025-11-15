import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface StorageFile {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  isDirectory: boolean;
}

export interface PublicShare {
  id: number;
  shareId: string;
  bucketName: string;
  filePath: string;
  fileName: string;
  contentType: string | null;
  fileSize: number | null;
  expiresAt: string;
  accessCount: number;
  maxAccessCount: number | null;
  isPasswordProtected: boolean;
  createdAt: string;
  isExpired: boolean;
  isAccessLimitReached: boolean;
}

export const storageKeys = {
  root: ["storage"] as const,
  files: (prefix: string) => [...storageKeys.root, "files", prefix] as const,
  shares: (filePath: string) => [...storageKeys.root, "shares", filePath] as const,
};

export function useStorageFiles(prefix: string) {
  return useQuery({
    queryKey: storageKeys.files(prefix),
    queryFn: async () => {
      const { data } = await api.get<{ data: StorageFile[] }>("/storage/files", {
        params: { prefix: prefix || undefined, delimiter: "/" },
      });
      return data.data;
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { file: File; filePath?: string; contentType?: string }) => {
      const formData = new FormData();
      formData.append("file", params.file);
      if (params.filePath) {
        formData.append("filePath", params.filePath);
      }
      if (params.contentType) {
        formData.append("contentType", params.contentType);
      }
      const { data } = await api.post<{ data: { filePath: string } }>("/storage/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.root });
    },
  });
}

export function useBulkUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (files: FileList | File[]) => {
      const formData = new FormData();
      for (const file of Array.from(files)) {
        formData.append("files", file);
      }
      const { data } = await api.post<{ data: { uploadedFiles: string[]; failedFiles: Array<{ filePath: string; error: string }> } }>(
        "/storage/files/bulk-upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.root });
    },
  });
}

export function useDeleteFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (filePaths: string[]) => {
      const { data } = await api.delete<{ data: { deletedCount: number } }>("/storage/files", {
        data: { filePaths },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.root });
    },
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderPath: string) => {
      const { data } = await api.post<{ data: { folderPath: string } }>("/storage/folders", { folderPath });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.root });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderPath: string) => {
      const { data } = await api.delete<{ data: { deletedCount: number } }>(
        `/storage/folders/${encodeURIComponent(folderPath)}`,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.root });
    },
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { oldPath: string; newPath: string }) => {
      const { data } = await api.put<{ data: { newPath: string } }>("/storage/files/rename", params);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.root });
    },
  });
}

export function useStorageShares(filePath: string | null) {
  return useQuery({
    queryKey: filePath ? storageKeys.shares(filePath) : ["storage", "shares", "none"],
    enabled: Boolean(filePath),
    queryFn: async () => {
      const { data } = await api.get<{ data: PublicShare[] }>("/storage/shares", {
        params: { filePath },
      });
      return data.data;
    },
  });
}

export function useCreateShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { filePath: string; expiresInHours?: number; maxAccessCount?: number; password?: string }) => {
      const { data } = await api.post<{ data: PublicShare }>("/storage/shares", input);
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: storageKeys.shares(variables.filePath) });
    },
  });
}

export function useRevokeShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { shareId: string; filePath: string }) => {
      await api.delete(`/storage/shares/${params.shareId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: storageKeys.root });
      queryClient.invalidateQueries({ queryKey: storageKeys.shares(variables.filePath) });
    },
  });
}
