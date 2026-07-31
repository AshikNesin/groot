import { Folder, FolderPlus, Home, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@groot/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@groot/ui/breadcrumb";
import { EmptyState } from "@groot/ui/empty-state";
import { SkeletonCard, SkeletonTable } from "@groot/ui/loading-skeleton";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@groot/ui/table";
import { PageLayout } from "@groot/shell/components/layout/PageLayout";
import { CreateFolderDialog } from "./components/CreateFolderDialog";
import { DesktopFileRow } from "./components/DesktopFileRow";
import { MobileFileCard } from "./components/MobileFileCard";
import { RenameDialog } from "./components/RenameDialog";
import { useStorageActions } from "./hooks/useStorageActions";
import type { StorageFile } from "./hooks/useStorage";

interface StorageProps {
  /**
   * Override the default "open in new tab" view behavior with an in-app
   * viewer. Receives the file being viewed.
   */
  onView?: (file: StorageFile) => void;
}

export function Storage({ onView }: StorageProps = {}) {
  const s = useStorageActions();

  const actions = (
    <Button
      variant="outline"
      size="icon"
      onClick={() => s.refetchFiles()}
      aria-label="Refresh files"
    >
      <RefreshCw className="size-4" />
    </Button>
  );

  const lastCrumbIndex = s.breadcrumbs.length - 1;

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <button
              type="button"
              onClick={() => s.navigateToFolder("")}
              aria-label="Go to root folder"
            >
              <Home className="size-4" />
            </button>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {s.breadcrumbs.map((crumb, index) => (
          <BreadcrumbItem key={crumb.path}>
            <BreadcrumbSeparator />
            {index === lastCrumbIndex ? (
              <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <button type="button" onClick={() => s.navigateToFolder(crumb.path)}>
                  {crumb.name}
                </button>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );

  return (
    <PageLayout
      title="Storage"
      description="Browse and manage your files and folders"
      actions={actions}
      breadcrumb={breadcrumb}
      maxWidth="7xl"
    >
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <input
          ref={s.uploadInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={s.handleUpload}
        />

        <Button onClick={() => s.uploadInputRef.current?.click()}>
          <Upload className="size-4" />
          Upload
        </Button>

        <Button variant="outline" onClick={() => s.setFolderDialogOpen(true)}>
          <FolderPlus className="size-4" />
          New Folder
        </Button>

        {s.selectedFiles.size > 0 && (
          <>
            <Button variant="outline" onClick={s.clearSelection}>
              Clear ({s.selectedFiles.size})
            </Button>
            <Button variant="destructive" onClick={s.handleDeleteSelected}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </>
        )}

        {s.fileCount > 0 && (
          <Button variant="outline" onClick={s.selectAllFiles}>
            Select All Files
          </Button>
        )}
      </div>

      {/* File list */}
      {s.isLoading ? (
        <>
          {/* Mobile card placeholders */}
          <div className="space-y-3 md:hidden">
            {["w-40", "w-32", "w-48"].map((w) => (
              <SkeletonCard key={w} titleWidth={w} lines={2} />
            ))}
          </div>
          {/* Desktop table placeholder */}
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <SkeletonTable columns={5} rows={6} />
          </div>
        </>
      ) : s.files.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="No files found"
          description="This folder is empty. Upload files or create a new folder to get started."
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden">
            {s.files.map((file) => (
              <MobileFileCard
                key={file.key}
                file={file}
                selected={s.selectedFiles.has(file.key)}
                onToggle={s.toggleFileSelection}
                onNavigate={s.navigateToFolder}
                onDeleteFolder={s.handleDeleteFolder}
                onView={onView}
              />
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead aria-label="Select file" className="w-12" />
                  <TableHead>Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.files.map((file) => (
                  <DesktopFileRow
                    key={file.key}
                    file={file}
                    selected={s.selectedFiles.has(file.key)}
                    onToggle={s.toggleFileSelection}
                    onNavigate={s.navigateToFolder}
                    onDeleteFolder={s.handleDeleteFolder}
                    onDeleteFile={s.handleDeleteFile}
                    onRename={s.startRename}
                    onView={onView}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <CreateFolderDialog
        open={s.folderDialogOpen}
        onOpenChange={s.setFolderDialogOpen}
        currentPath={s.currentPath}
        isPending={s.createFolder.isPending}
        onCreate={s.handleCreateFolder}
      />

      <RenameDialog
        open={Boolean(s.renameTarget)}
        onOpenChange={(open) => !open && s.setRenameTarget(null)}
        currentName={s.renameTarget?.name}
        isPending={s.renameFile.isPending}
        onRename={s.handleRename}
      />
    </PageLayout>
  );
}
