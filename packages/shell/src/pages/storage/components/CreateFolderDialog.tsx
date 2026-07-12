import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@groot/ui/dialog";
import { Button } from "@groot/ui/button";
import { Input } from "@groot/ui/input";
import { Label } from "@groot/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  folderName: string;
  onFolderNameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
};

/** Modal form for creating a new folder. */
export function CreateFolderDialog({
  open,
  onOpenChange,
  currentPath,
  folderName,
  onFolderNameChange,
  onSubmit,
  isPending,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Enter a name for the new folder in {currentPath || "root"}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="my-folder"
              value={folderName}
              onChange={(event) => onFolderNameChange(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                }
              }}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
