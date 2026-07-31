import { Button } from "@groot/ui/button";
import { Checkbox } from "@groot/ui/checkbox";
import { TableCell, TableRow } from "@groot/ui/table";
import { handleDownload, handleView } from "@groot/shell/pages/storage/hooks/useStorageActions";
import type { StorageFile } from "@groot/shell/pages/storage/hooks/useStorage";
import { Download, Edit3, File as FileIcon, Folder, Trash2 } from "lucide-react";
import { formatBytes, formatDate } from "@groot/shell/lib/utils";

type Props = {
  file: StorageFile;
  selected: boolean;
  onToggle: (key: string) => void;
  onNavigate: (key: string) => void;
  onDeleteFolder: (key: string) => void;
  onDeleteFile: (key: string) => void;
  onRename: (key: string, name: string) => void;
  onView?: (file: StorageFile) => void;
};

/** Desktop table row for a single file/folder. */
export function DesktopFileRow({
  file,
  selected,
  onToggle,
  onNavigate,
  onDeleteFolder,
  onDeleteFile,
  onRename,
  onView,
}: Props) {
  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell>
        {!file.isDirectory && (
          <Checkbox checked={selected} onCheckedChange={() => onToggle(file.key)} />
        )}
      </TableCell>
      <TableCell>
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left"
          onClick={() => {
            if (file.isDirectory) {
              onNavigate(file.key);
            }
          }}
          disabled={!file.isDirectory}
        >
          {file.isDirectory ? (
            <Folder className="size-4 text-info" />
          ) : (
            <FileIcon className="size-4 text-muted-foreground" />
          )}
          <span className={file.isDirectory ? "font-medium text-info" : ""}>{file.name}</span>
        </button>
      </TableCell>
      <TableCell>{file.isDirectory ? "-" : formatBytes(file.size)}</TableCell>
      <TableCell>{formatDate(file.lastModified)}</TableCell>
      <TableCell className="text-right">
        {file.isDirectory ? (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onDeleteFolder(file.key)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (onView ? onView(file) : handleView(file.key))}
            >
              View
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDownload(file.key, file.name)}>
              <Download className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onRename(file.key, file.name)}>
              <Edit3 className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDeleteFile(file.key)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
