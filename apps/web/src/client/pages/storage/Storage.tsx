import { ChevronRight, Folder, FolderPlus, Home, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@groot/ui/button";
import { CreateFolderDialog } from "./components/CreateFolderDialog";
import { DesktopFileRow } from "./components/DesktopFileRow";
import { MobileFileCard } from "./components/MobileFileCard";
import { RenameDialog } from "./components/RenameDialog";
import { useStorageActions } from "./hooks/useStorageActions";

export function Storage() {
  const s = useStorageActions();

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
        <Button
          variant="outline"
          size="icon"
          onClick={() => s.refetchFiles()}
          aria-label="Refresh files"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Breadcrumb navigation */}
        <nav className="flex items-center space-x-1 text-sm">
          <button
            type="button"
            onClick={() => s.navigateToFolder("")}
            aria-label="Go to root folder"
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <Home className="h-4 w-4" />
          </button>
          {s.breadcrumbs.map((crumb) => (
            <div key={crumb.path} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <button
                type="button"
                onClick={() => s.navigateToFolder(crumb.path)}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </nav>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <input ref={s.uploadInputRef} type="file" className="hidden" onChange={s.handleUpload} />
          <input
            ref={s.bulkInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={s.handleBulkUpload}
          />

          <Button onClick={() => s.uploadInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>

          <Button variant="outline" onClick={() => s.setFolderDialogOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>

          {s.selectedFiles.size > 0 && (
            <>
              <Button variant="outline" onClick={s.clearSelection}>
                Clear ({s.selectedFiles.size})
              </Button>
              <Button variant="destructive" onClick={s.handleDeleteSelected}>
                <Trash2 className="mr-2 h-4 w-4" />
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
          <div className="py-10 text-center text-sm text-muted-foreground">Loading files...</div>
        ) : s.files.length === 0 ? (
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
              {s.files.map((file) => (
                <MobileFileCard
                  key={file.key}
                  file={file}
                  selected={s.selectedFiles.has(file.key)}
                  onToggle={s.toggleFileSelection}
                  onNavigate={s.navigateToFolder}
                  onDeleteFolder={s.handleDeleteFolder}
                />
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden overflow-hidden rounded-lg border md:block">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th aria-label="Select file" className="w-12 px-4 py-3" />
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Size</th>
                    <th className="px-4 py-3 text-left font-medium">Modified</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
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
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <CreateFolderDialog
        open={s.folderDialogOpen}
        onOpenChange={s.setFolderDialogOpen}
        currentPath={s.currentPath}
        folderName={s.folderName}
        onFolderNameChange={s.setFolderName}
        onSubmit={s.handleCreateFolder}
        isPending={s.createFolder.isPending}
      />

      <RenameDialog
        open={Boolean(s.renameTarget)}
        onOpenChange={(open) => !open && s.setRenameTarget(null)}
        currentName={s.renameTarget?.name}
        value={s.renameValue}
        onValueChange={s.setRenameValue}
        onSubmit={s.handleRename}
        isPending={s.renameFile.isPending}
      />
    </div>
  );
}
