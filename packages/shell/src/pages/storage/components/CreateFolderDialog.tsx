import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@groot/ui/dialog";
import { Button } from "@groot/ui/button";
import { Form, FormField } from "@groot/ui/form";
import { Input } from "@groot/ui/input";

const folderSchema = z.object({
  name: z.string().min(1, "Folder name is required"),
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  isPending: boolean;
  onCreate: (name: string) => void;
};

/** Modal form for creating a new folder. Owns its own field state. */
export function CreateFolderDialog({
  open,
  onOpenChange,
  currentPath,
  isPending,
  onCreate,
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
        <Form
          schema={folderSchema}
          defaultValues={{ name: "" }}
          onSubmit={({ name }) => onCreate(name)}
          className="space-y-4"
        >
          <FormField name="name" label="Folder Name">
            <Input placeholder="my-folder" />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
