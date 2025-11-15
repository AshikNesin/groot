import { useMemo, useRef, useState } from "react";
import { Folder, HardDrive, Upload, ArrowLeft, Share2, Download, Trash2, File as FileIcon, Link as LinkIcon, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublicShare } from "@/hooks/api/useStorage";
import {
  useBulkUpload,
  useCreateFolder,
  useCreateShare,
  useDeleteFiles,
  useDeleteFolder,
  useRenameFile,
  useRevokeShare,
  useStorageFiles,
  useStorageShares,
  useUploadFile,
} from "@/hooks/api/useStorage";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

export function Storage() {
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<{ key: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [shareTarget, setShareTarget] = useState<{ key: string; name: string } | null>(null);
  const [shareForm, setShareForm] = useState({ expiresInHours: 24, maxAccessCount: "", password: "" });
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const { data: files = [], isLoading } = useStorageFiles(currentPrefix);
  const uploadFile = useUploadFile();
  const bulkUpload = useBulkUpload();
  const deleteFiles = useDeleteFiles();
  const deleteFolder = useDeleteFolder();
  const createFolder = useCreateFolder();
  const renameFile = useRenameFile();
  const createShare = useCreateShare();
  const revokeShare = useRevokeShare();
  const { data: shares = [], isFetching: sharesLoading } = useStorageShares(shareTarget?.key ?? null);

  const breadcrumbs = useMemo(() => {
    const segments = currentPrefix.split("/").filter(Boolean);
    const crumbs = [{ label: "Root", path: "" }];
    segments.forEach((segment, index) => {
      const path = `${segments.slice(0, index + 1).join("/")}/`;
      crumbs.push({ label: segment, path });
    });
    return crumbs;
  }, [currentPrefix]);

  const handleNavigate = (path: string) => {
    setCurrentPrefix(path);
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadFile
      .mutateAsync({ file, filePath: `${currentPrefix}${file.name}` })
      .then(() => {
        toast({ title: "Upload complete", description: `${file.name} uploaded successfully` });
      })
      .catch((error) => {
        console.error(error);
        toast({ title: "Upload failed", description: "Unable to upload file", variant: "destructive" });
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
        toast({ title: "Bulk upload failed", description: "Unable to upload files", variant: "destructive" });
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
      toast({ title: "Delete failed", description: "Unable to delete file", variant: "destructive" });
    }
  };

  const handleDeleteFolder = async (folderKey: string) => {
    try {
      await deleteFolder.mutateAsync(folderKey);
      toast({ title: "Folder deleted", description: folderKey });
    } catch (error) {
      console.error(error);
      toast({ title: "Delete failed", description: "Unable to delete folder", variant: "destructive" });
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
    } catch (error) {
      console.error(error);
      toast({ title: "Download failed", description: "Unable to download file", variant: "destructive" });
    }
  };

  const handleCreateFolder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!folderName.trim()) return;
    const path = `${currentPrefix}${folderName.trim().replace(/\/+$/u, "")}/`;
    try {
      await createFolder.mutateAsync(path);
      toast({ title: "Folder created", description: path });
      setFolderDialogOpen(false);
      setFolderName("");
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to create folder", description: "Please try again", variant: "destructive" });
    }
  };

  const handleRename = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    const newPath = `${currentPrefix}${renameValue.trim()}`;
    try {
      await renameFile.mutateAsync({ oldPath: renameTarget.key, newPath });
      toast({ title: "File renamed", description: `${renameTarget.name} → ${renameValue}` });
      setRenameTarget(null);
      setRenameValue("");
    } catch (error) {
      console.error(error);
      toast({ title: "Rename failed", description: "Unable to rename file", variant: "destructive" });
    }
  };

  const handleShareSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shareTarget) return;
    try {
      await createShare.mutateAsync({
        filePath: shareTarget.key,
        expiresInHours: shareForm.expiresInHours,
        maxAccessCount: shareForm.maxAccessCount ? Number(shareForm.maxAccessCount) : undefined,
        password: shareForm.password || undefined,
      });
      toast({ title: "Share created", description: "Public link ready" });
      setShareForm({ expiresInHours: 24, maxAccessCount: "", password: "" });
    } catch (error) {
      console.error(error);
      toast({ title: "Share failed", description: "Unable to create share", variant: "destructive" });
    }
  };

  const copyShareLink = (share: PublicShare) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/api/v1/public/files/${share.shareId}`;
    void navigator.clipboard.writeText(url)
      .then(() => {
        toast({ title: "Copied", description: "Share link copied to clipboard" });
      })
      .catch(() => {
        toast({ title: "Copy failed", description: url, variant: "destructive" });
      });
  };

  const handleRevokeShare = async (share: PublicShare) => {
    try {
      await revokeShare.mutateAsync({ shareId: share.shareId, filePath: share.filePath });
      toast({ title: "Share revoked" });
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to revoke", description: "Please try again", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Storage</h1>
          <p className="text-muted-foreground">Manage files stored in your S3 bucket</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={uploadInputRef} type="file" className="hidden" onChange={handleUpload} />
          <input ref={bulkInputRef} type="file" className="hidden" multiple onChange={handleBulkUpload} />
          <Button variant="outline" size="sm" onClick={() => uploadInputRef.current?.click()}> 
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulkInputRef.current?.click()}>
            <HardDrive className="mr-2 h-4 w-4" /> Bulk Upload
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFolderDialogOpen(true)}>
            <Folder className="mr-2 h-4 w-4" /> New Folder
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!currentPrefix) return;
              const trimmed = currentPrefix.replace(/\/+$/u, "");
              const parent = trimmed.split("/").slice(0, -1).join("/");
              setCurrentPrefix(parent ? `${parent}/` : "");
            }}
            disabled={!currentPrefix}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Up
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Current path</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path || "root"} className="flex items-center">
              <button
                type="button"
                className={`text-left text-primary transition hover:underline ${index === breadcrumbs.length - 1 ? "font-semibold" : ""}`}
                onClick={() => handleNavigate(crumb.path)}
                disabled={index === breadcrumbs.length - 1}
              >
                {crumb.label || "/"}
              </button>
              {index < breadcrumbs.length - 1 && <span className="px-2 text-muted-foreground">/</span>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Files</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading files...</p>
          ) : files.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No files in this directory.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Size</th>
                  <th className="py-2 font-medium">Last Modified</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.key} className="border-t border-border/60">
                    <td className="py-3">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left transition hover:text-primary"
                        onClick={() => {
                          if (file.isDirectory) {
                            setCurrentPrefix(file.key);
                          }
                        }}
                        disabled={!file.isDirectory}
                      >
                        {file.isDirectory ? <Folder className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
                        {file.name || file.key}
                      </button>
                    </td>
                    <td className="py-3 text-muted-foreground">{file.isDirectory ? "--" : formatBytes(file.size)}</td>
                    <td className="py-3 text-muted-foreground">
                      {new Date(file.lastModified).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        {!file.isDirectory && (
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(file.key, file.name)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRenameTarget({ key: file.key, name: file.name });
                            setRenameValue(file.name);
                          }}
                          disabled={file.isDirectory}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {!file.isDirectory && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShareTarget({ key: file.key, name: file.name })}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => (file.isDirectory ? handleDeleteFolder(file.key) : handleDeleteFile(file.key))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create folder</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateFolder}>
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder name</Label>
              <Input
                id="folder-name"
                placeholder="e.g., invoices"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
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

      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleRename}>
            <div className="space-y-2">
              <Label htmlFor="rename-value">New name</Label>
              <Input
                id="rename-value"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                required
              />
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

      <Dialog open={Boolean(shareTarget)} onOpenChange={(open) => !open && setShareTarget(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Share {shareTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <form className="space-y-4" onSubmit={handleShareSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="expires">Expires in (hours)</Label>
                  <Input
                    id="expires"
                    type="number"
                    min={1}
                    value={shareForm.expiresInHours}
                    onChange={(event) => setShareForm((prev) => ({ ...prev, expiresInHours: Number(event.target.value) }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-access">Max accesses (optional)</Label>
                  <Input
                    id="max-access"
                    type="number"
                    min={1}
                    value={shareForm.maxAccessCount}
                    onChange={(event) => setShareForm((prev) => ({ ...prev, maxAccessCount: event.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password (optional)</Label>
                <Input
                  id="password"
                  type="password"
                  value={shareForm.password}
                  onChange={(event) => setShareForm((prev) => ({ ...prev, password: event.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShareTarget(null)}>
                  Close
                </Button>
                <Button type="submit" disabled={createShare.isPending}>
                  {createShare.isPending ? "Creating..." : "Create share"}
                </Button>
              </DialogFooter>
            </form>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Existing shares</h3>
              {sharesLoading ? (
                <p className="text-sm text-muted-foreground">Loading shares...</p>
              ) : shares.length === 0 ? (
                <p className="text-sm text-muted-foreground">No shares yet.</p>
              ) : (
                <div className="space-y-2">
                  {shares.map((share) => (
                    <div
                      key={share.shareId}
                      className="flex flex-col gap-2 rounded-md border border-border/60 p-3 text-sm md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-medium">{share.shareId}</p>
                        <p className="text-muted-foreground">
                          Expires {new Date(share.expiresAt).toLocaleString()} · Accesses {share.accessCount}
                        </p>
                        {share.isPasswordProtected && <p className="text-muted-foreground">Password protected</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyShareLink(share)}>
                          <LinkIcon className="mr-2 h-4 w-4" /> Copy link
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRevokeShare(share)}>
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
