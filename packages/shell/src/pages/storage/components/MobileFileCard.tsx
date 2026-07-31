import { Button } from "@groot/ui/button";
import { Card } from "@groot/ui/card";
import { Checkbox } from "@groot/ui/checkbox";
import { cn } from "@groot/ui/lib/utils";
import { handleDownload, handleView } from "@groot/shell/pages/storage/hooks/useStorageActions";
import type { StorageFile } from "@groot/shell/pages/storage/hooks/useStorage";
import { Download, File as FileIcon, Folder, Trash2 } from "lucide-react";
import { formatBytes, formatDate } from "@groot/shell/lib/utils";

type Props = {
  file: StorageFile;
  selected: boolean;
  onToggle: (key: string) => void;
  onNavigate: (key: string) => void;
  onDeleteFolder: (key: string) => void;
  onView?: (file: StorageFile) => void;
};

/** Mobile card view for a single file/folder. */
export function MobileFileCard({
  file,
  selected,
  onToggle,
  onNavigate,
  onDeleteFolder,
  onView,
}: Props) {
  return (
    <Card className={cn("gap-3 p-4", selected && "bg-muted")}>
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {!file.isDirectory && (
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggle(file.key)}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {file.isDirectory ? (
            <button
              type="button"
              className="flex items-center gap-2"
              onClick={() => onNavigate(file.key)}
            >
              <Folder className="size-5 flex-shrink-0 text-info" />
              <span className="truncate font-medium text-info">{file.name}</span>
            </button>
          ) : (
            <>
              <FileIcon className="size-5 flex-shrink-0 text-muted-foreground" />
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
          <span className="font-medium text-foreground">{formatDate(file.lastModified)}</span>
        </div>
      </div>

      {file.isDirectory ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDeleteFolder(file.key)}
          className="w-full"
        >
          <Trash2 className="size-4" />
          Delete Folder
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (onView ? onView(file) : handleView(file.key))}
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
            <Download className="size-4" />
            Download
          </Button>
        </div>
      )}
    </Card>
  );
}
