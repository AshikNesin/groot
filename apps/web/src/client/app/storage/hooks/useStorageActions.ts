import { useMemo, useRef, useState } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { api } from "@groot/client/lib/api";
import { toast } from "sonner";
import {
  useBulkUpload,
  useCreateFolder,
  useDeleteFiles,
  useDeleteFolder,
  useRenameFile,
  useStorageFiles,
  useUploadFile,
} from "./useStorage";

/** Download a file via a programmatic blob URL. */
export async function handleDownload(filePath: string, name: string): Promise<void> {
  try {
    const response = await api.get("/storage/files/download", {
      params: { filePath },
      responseType: "blob",
    });
    const blobUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = name;
    link.click();
    window.URL.revokeObjectURL(blobUrl);
    toast.success("Success", { description: "File downloaded successfully" });
  } catch (error) {
    console.error(error);
    toast.error("Download failed", { description: "Unable to download file" });
  }
}

/** Open a file in a new tab. Opens the tab before the await so the browser ties
 * it to the click's user activation — opening after an await is popup-blocked. */
export async function handleView(filePath: string): Promise<void> {
  const win = window.open("", "_blank");
  try {
    const response = await api.get("/storage/files/download", {
      params: { filePath },
      responseType: "blob",
    });
    const blobUrl = window.URL.createObjectURL(response.data);
    if (win) {
      win.location.href = blobUrl;
    } else {
      window.location.href = blobUrl; // popup blocked — fall back to same tab
    }
    // The new tab has loaded the blob by the time this fires; release it so the
    // blob data isn't pinned for the page's lifetime (matches handleDownload).
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
  } catch (error) {
    win?.close();
    console.error(error);
    toast.error("View failed", { description: "Unable to view file" });
  }
}

/** All state, mutations, and handlers for the Storage page. */
export function useStorageActions() {
  const [currentPath, setCurrentPath] = useQueryState("path", parseAsString.withDefault(""));
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<{ key: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);

  const { data: files = [], isLoading, refetch: refetchFiles } = useStorageFiles(currentPath);
  const uploadFile = useUploadFile();
  const bulkUpload = useBulkUpload();
  const deleteFiles = useDeleteFiles();
  const deleteFolder = useDeleteFolder();
  const createFolder = useCreateFolder();
  const renameFile = useRenameFile();

  const breadcrumbs = useMemo(() => {
    if (!currentPath) return [];
    const parts = currentPath.split("/").filter(Boolean);
    return parts.map((part, index) => ({
      name: part,
      path: `${parts.slice(0, index + 1).join("/")}/`,
    }));
  }, [currentPath]);

  const fileCount = files.filter((f) => !f.isDirectory).length;

  const navigateToFolder = (path: string) => {
    setCurrentPath(path);
    setSelectedFiles(new Set());
  };

  const toggleFileSelection = (fileKey: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileKey)) {
      newSelection.delete(fileKey);
    } else {
      newSelection.add(fileKey);
    }
    setSelectedFiles(newSelection);
  };

  const selectAllFiles = () => {
    const allFileKeys = files.flatMap((f) => (f.isDirectory ? [] : [f.key]));
    setSelectedFiles(new Set(allFileKeys));
  };

  const clearSelection = () => setSelectedFiles(new Set());

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadFile
      .mutateAsync({ file, filePath: `${currentPath}${file.name}` })
      .then(() => {
        toast.success("Upload complete", { description: `${file.name} uploaded successfully` });
      })
      .catch((error) => {
        console.error(error);
        toast.error("Upload failed", { description: "Unable to upload file" });
      })
      .finally(() => {
        event.target.value = "";
      });
  };

  const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = event.target.files;
    if (!filesList || !filesList.length) return;
    bulkUpload
      .mutateAsync(filesList)
      .then((result) => {
        const successCount = result.uploadedFiles.length;
        const failureCount = result.failedFiles.length;
        const description = `${successCount} uploaded${
          failureCount ? `, ${failureCount} failed` : ""
        }`;
        if (failureCount) {
          toast.error("Bulk upload complete", { description });
        } else {
          toast.success("Bulk upload complete", { description });
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error("Bulk upload failed", { description: "Unable to upload files" });
      })
      .finally(() => {
        event.target.value = "";
      });
  };

  const handleDeleteFile = async (key: string) => {
    try {
      await deleteFiles.mutateAsync([key]);
      toast.success("Deleted", { description: "File removed" });
    } catch (error) {
      console.error(error);
      toast.error("Delete failed", { description: "Unable to delete file" });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`Delete ${selectedFiles.size} file(s)?`)) return;

    try {
      await deleteFiles.mutateAsync(Array.from(selectedFiles));
      toast.success("Deleted", { description: `${selectedFiles.size} file(s) removed` });
      clearSelection();
    } catch (error) {
      console.error(error);
      toast.error("Delete failed", { description: "Unable to delete files" });
    }
  };

  const handleDeleteFolder = async (folderKey: string) => {
    if (!confirm(`Delete folder "${folderKey}" and all its contents?`)) return;
    try {
      await deleteFolder.mutateAsync(folderKey);
      toast.success("Folder deleted", { description: folderKey });
    } catch (error) {
      console.error(error);
      toast.error("Delete failed", { description: "Unable to delete folder" });
    }
  };

  const handleCreateFolder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!folderName.trim()) return;
    const path = `${currentPath}${folderName.trim().replace(/\/+$/u, "")}/`;
    try {
      await createFolder.mutateAsync(path);
      toast.success("Folder created", { description: path });
      setFolderDialogOpen(false);
      setFolderName("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create folder", { description: "Please try again" });
    }
  };

  const handleRename = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    const newPath = `${currentPath}${renameValue.trim()}`;
    try {
      await renameFile.mutateAsync({ oldPath: renameTarget.key, newPath });
      toast.success("File renamed", {
        description: `${renameTarget.name} → ${renameValue}`,
      });
      setRenameTarget(null);
      setRenameValue("");
      clearSelection();
    } catch (error) {
      console.error(error);
      toast.error("Rename failed", { description: "Unable to rename file" });
    }
  };

  const startRename = (key: string, name: string) => {
    setRenameTarget({ key, name });
    setRenameValue(name);
  };

  return {
    files,
    isLoading,
    refetchFiles,
    breadcrumbs,
    fileCount,
    currentPath,
    selectedFiles,
    folderDialogOpen,
    setFolderDialogOpen,
    folderName,
    setFolderName,
    renameTarget,
    renameValue,
    setRenameValue,
    setRenameTarget,
    uploadInputRef,
    bulkInputRef,
    createFolder,
    renameFile,
    navigateToFolder,
    toggleFileSelection,
    selectAllFiles,
    clearSelection,
    handleUpload,
    handleBulkUpload,
    handleDeleteFile,
    handleDeleteSelected,
    handleDeleteFolder,
    handleCreateFolder,
    handleRename,
    startRename,
  };
}
