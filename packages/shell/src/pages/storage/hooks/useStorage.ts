import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@groot/shell/lib/api";

export interface StorageFile {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  isDirectory: boolean;
}

export const storageKeys = {
  root: ["storage"] as const,
  files: (prefix: string) => [...storageKeys.root, "files", prefix] as const,
};

export function useStorageFiles(prefix: string) {
  return useQuery({
    queryKey: storageKeys.files(prefix),
    queryFn: () =>
      apiClient.get<StorageFile[]>("/storage/files", {
        prefix: prefix || undefined,
        delimiter: "/",
      }),
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
      return apiClient.postForm<{ filePath: string }>("/storage/files/upload", formData);
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
      return apiClient.postForm<{
        uploadedFiles: string[];
        failedFiles: Array<{ filePath: string; error: string }>;
      }>("/storage/files/bulk-upload", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.root });
    },
  });
}

export function useDeleteFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (filePaths: string[]) =>
      apiClient.delete<{ deletedCount: number }>("/storage/files", { filePaths }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.root });
    },
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderPath: string) =>
      apiClient.post<{ folderPath: string }>("/storage/folders", { folderPath }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.root });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderPath: string) =>
      apiClient.delete<{ deletedCount: number }>(
        `/storage/folders/${encodeURIComponent(folderPath)}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.root });
    },
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { oldPath: string; newPath: string }) =>
      apiClient.put<{ newPath: string }>("/storage/files/rename", params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.root });
    },
  });
}
