import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@groot/client/lib/api";

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
      const { data } = await api.post<{ data: { filePath: string } }>(
        "/storage/files/upload",
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

export function useBulkUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (files: FileList | File[]) => {
      const formData = new FormData();
      for (const file of Array.from(files)) {
        formData.append("files", file);
      }
      const { data } = await api.post<{
        data: {
          uploadedFiles: string[];
          failedFiles: Array<{ filePath: string; error: string }>;
        };
      }>("/storage/files/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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
      const { data } = await api.post<{ data: { folderPath: string } }>("/storage/folders", {
        folderPath,
      });
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
      const { data } = await api.put<{ data: { newPath: string } }>(
        "/storage/files/rename",
        params,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.root });
    },
  });
}
