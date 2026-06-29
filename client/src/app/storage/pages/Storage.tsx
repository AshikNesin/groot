import { useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Download,
  File as FileIcon,
  Folder,
  FolderPlus,
  Home,
  RefreshCw,
  Trash2,
  Upload,
  Edit3,
} from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import {
  useBulkUpload,
  useCreateFolder,
  useDeleteFiles,
  useDeleteFolder,
  useRenameFile,
  useStorageFiles,
  useUploadFile,
} from "@/app/storage/hooks/useStorage";
import { useToast } from "@/core/hooks/use-toast";
import { api } from "@/core/lib/api";
import { formatBytes, formatDate } from "@/core/lib/utils";

export function Storage() {
  const [currentPath, setCurrentPath] = useQueryState("path", parseAsString.withDefault(""));
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<{
    key: string;
    name: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

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
    const allFileKeys = files.filter((f) => !f.isDirectory).map((f) => f.key);
    setSelectedFiles(new Set(allFileKeys));
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadFile
      .mutateAsync({ file, filePath: `${currentPath}${file.name}` })
      .then(() => {
        toast({
          title: "Upload complete",
          description: `${file.name} uploaded successfully`,
        });
      })
      .catch((error) => {
        console.error(error);
        toast({
          title: "Upload failed",
          description: "Unable to upload file",
          variant: "destructive",
        });
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
        toast({
          title: "Bulk upload complete",
          description: `${successCount} uploaded${failureCount ? `, ${failureCount} failed` : ""}`,
          variant: failureCount ? "destructive" : "default",
        });
      })
      .catch((error) => {
        console.error(error);
        toast({
          title: "Bulk upload failed",
          description: "Unable to upload files",
          variant: "destructive",
        });
      })
      .finally(() => {
        event.target.value = "";
      });
  };

  const handleDeleteFile = async (key: string) => {
    try {
      await deleteFiles.mutateAsync([key]);
      toast({ title: "Deleted", description: "File removed" });
    } catch (error) {
      console.error(error);
      toast({
        title: "Delete failed",
        description: "Unable to delete file",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`Delete ${selectedFiles.size} file(s)?`)) return;

    try {
      await deleteFiles.mutateAsync(Array.from(selectedFiles));
      toast({
        title: "Deleted",
        description: `${selectedFiles.size} file(s) removed`,
      });
      clearSelection();
    } catch (error) {
      console.error(error);
      toast({
        title: "Delete failed",
        description: "Unable to delete files",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFolder = async (folderKey: string) => {
    if (!confirm(`Delete folder "${folderKey}" and all its contents?`)) return;
    try {
      await deleteFolder.mutateAsync(folderKey);
      toast({ title: "Folder deleted", description: folderKey });
    } catch (error) {
      console.error(error);
      toast({
        title: "Delete failed",
        description: "Unable to delete folder",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (filePath: string, name: string) => {
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
      toast({ title: "Success", description: "File downloaded successfully" });
    } catch (error) {
      console.error(error);
      toast({
        title: "Download failed",
        description: "Unable to download file",
        variant: "destructive",
      });
    }
  };

  const handleView = async (filePath: string) => {
    try {
      const response = await api.get("/storage/files/download", {
        params: { filePath },
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(response.data);
      window.open(blobUrl, "_blank");
    } catch (error) {
      console.error(error);
      toast({
        title: "View failed",
        description: "Unable to view file",
        variant: "destructive",
      });
    }
  };

  const handleCreateFolder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!folderName.trim()) return;
    const path = `${currentPath}${folderName.trim().replace(/\/+$/u, "")}/`;
    try {
      await createFolder.mutateAsync(path);
      toast({ title: "Folder created", description: path });
      setFolderDialogOpen(false);
      setFolderName("");
    } catch (error) {
      console.error(error);
      toast({
        title: "Failed to create folder",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleRename = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    const newPath = `${currentPath}${renameValue.trim()}`;
    try {
      await renameFile.mutateAsync({ oldPath: renameTarget.key, newPath });
      toast({
        title: "File renamed",
        description: `${renameTarget.name} → ${renameValue}`,
      });
      setRenameTarget(null);
      setRenameValue("");
      clearSelection();
    } catch (error) {
      console.error(error);
      toast({
        title: "Rename failed",
        description: "Unable to rename file",
        variant: "destructive",
      });
    }
  };

  const fileCount = files.filter((f) => !f.isDirectory).length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Storage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and manage your files and folders
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetchFiles()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Breadcrumb navigation */}
        <nav className="flex items-center space-x-1 text-sm">
          <button
            type="button"
            onClick={() => navigateToFolder("")}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <Home className="h-4 w-4" />
          </button>
          {breadcrumbs.map((crumb) => (
            <div key={crumb.path} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <button
                type="button"
                onClick={() => navigateToFolder(crumb.path)}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </nav>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <input ref={uploadInputRef} type="file" className="hidden" onChange={handleUpload} />
          <input
            ref={bulkInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={handleBulkUpload}
          />

          <Button onClick={() => uploadInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>

          <Button variant="outline" onClick={() => setFolderDialogOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>

          {selectedFiles.size > 0 && (
            <>
              <Button variant="outline" onClick={clearSelection}>
                Clear ({selectedFiles.size})
              </Button>
              <Button variant="destructive" onClick={handleDeleteSelected}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}

          {fileCount > 0 && (
            <Button variant="outline" onClick={selectAllFiles}>
              Select All Files
            </Button>
          )}
        </div>

        {/* File list */}
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="py-20 text-center">
            <Folder className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-base font-medium text-foreground">No files found</h3>
            <p className="text-sm text-muted-foreground">
              This folder is empty. Upload files or create a new folder to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="space-y-3 md:hidden">
              {files.map((file) => (
                <div
                  key={file.key}
                  className={`space-y-3 rounded-lg border p-4 ${selectedFiles.has(file.key) ? "bg-info/10" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {!file.isDirectory && (
                        <Checkbox
                          checked={selectedFiles.has(file.key)}
                          onCheckedChange={() => toggleFileSelection(file.key)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      {file.isDirectory ? (
                        <button
                          type="button"
                          className="flex items-center gap-2"
                          onClick={() => navigateToFolder(file.key)}
                        >
                          <Folder className="h-5 w-5 flex-shrink-0 text-info" />
                          <span className="truncate font-medium text-info">{file.name}</span>
                        </button>
                      ) : (
                        <>
                          <FileIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                          <span className="truncate">{file.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="block">Size</span>
                      <span className="font-medium text-foreground">
                        {file.isDirectory ? "-" : formatBytes(file.size)}
                      </span>
                    </div>
                    <div>
                      <span className="block">Modified</span>
                      <span className="font-medium text-foreground">
                        {formatDate(file.lastModified)}
                      </span>
                    </div>
                  </div>

                  {file.isDirectory ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteFolder(file.key)}
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Folder
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(file.key)}
                        className="flex-1"
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(file.key, file.name)}
                        className="flex-1"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden overflow-hidden rounded-lg border md:block">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="w-12 px-4 py-3" />
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Size</th>
                    <th className="px-4 py-3 text-left font-medium">Modified</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr
                      key={file.key}
                      className={`border-t hover:bg-muted/40 ${selectedFiles.has(file.key) ? "bg-info/10" : ""}`}
                    >
                      <td className="px-4 py-3">
                        {!file.isDirectory && (
                          <Checkbox
                            checked={selectedFiles.has(file.key)}
                            onCheckedChange={() => toggleFileSelection(file.key)}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 text-left"
                          onClick={() => {
                            if (file.isDirectory) {
                              navigateToFolder(file.key);
                            }
                          }}
                          disabled={!file.isDirectory}
                        >
                          {file.isDirectory ? (
                            <Folder className="h-4 w-4 text-info" />
                          ) : (
                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={file.isDirectory ? "font-medium text-info" : ""}>
                            {file.name}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {file.isDirectory ? "-" : formatBytes(file.size)}
                      </td>
                      <td className="px-4 py-3">{formatDate(file.lastModified)}</td>
                      <td className="px-4 py-3 text-right">
                        {file.isDirectory ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFolder(file.key)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleView(file.key)}>
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(file.key, file.name)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRenameTarget({
                                  key: file.key,
                                  name: file.name,
                                });
                                setRenameValue(file.name);
                              }}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFile(file.key)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder in {currentPath || "root"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateFolder}>
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="my-folder"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateFolder(e as unknown as React.FormEvent<HTMLFormElement>);
                  }
                }}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFolderDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFolder.isPending}>
                {createFolder.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>Enter a new name for the file</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleRename}>
            <div className="space-y-2">
              <Label htmlFor="rename-value">New Name</Label>
              <Input
                id="rename-value"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                placeholder="filename.txt"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleRename(e as unknown as React.FormEvent<HTMLFormElement>);
                  }
                }}
                required
              />
              <p className="text-xs text-muted-foreground">Current: {renameTarget?.name}</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenameTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={renameFile.isPending}>
                {renameFile.isPending ? "Renaming..." : "Rename"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
