import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { handleDownload, handleView } from "@/app/storage/hooks/useStorageActions";
import type { StorageFile } from "@/app/storage/hooks/useStorage";
import { Download, Edit3, File as FileIcon, Folder, Trash2 } from "lucide-react";
import { formatBytes, formatDate } from "@/core/lib/utils";

type Props = {
  file: StorageFile;
  selected: boolean;
  onToggle: (key: string) => void;
  onNavigate: (key: string) => void;
  onDeleteFolder: (key: string) => void;
  onDeleteFile: (key: string) => void;
  onRename: (key: string, name: string) => void;
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
}: Props) {
  return (
    <tr className={`border-t hover:bg-muted/40 ${selected ? "bg-info/10" : ""}`}>
      <td className="px-4 py-3">
        {!file.isDirectory && (
          <Checkbox checked={selected} onCheckedChange={() => onToggle(file.key)} />
        )}
      </td>
      <td className="px-4 py-3">
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
            <Folder className="h-4 w-4 text-info" />
          ) : (
            <FileIcon className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={file.isDirectory ? "font-medium text-info" : ""}>{file.name}</span>
        </button>
      </td>
      <td className="px-4 py-3">{file.isDirectory ? "-" : formatBytes(file.size)}</td>
      <td className="px-4 py-3">{formatDate(file.lastModified)}</td>
      <td className="px-4 py-3 text-right">
        {file.isDirectory ? (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onDeleteFolder(file.key)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleView(file.key)}>
              View
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDownload(file.key, file.name)}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onRename(file.key, file.name)}>
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDeleteFile(file.key)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}
