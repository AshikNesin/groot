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

const renameSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string | undefined;
  isPending: boolean;
  onRename: (newName: string) => void;
};

/** Modal form for renaming a file. Owns its own field state, seeded from `currentName`. */
export function RenameDialog({ open, onOpenChange, currentName, isPending, onRename }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
          <DialogDescription>Enter a new name for the file</DialogDescription>
        </DialogHeader>
        <Form
          schema={renameSchema}
          defaultValues={{ name: currentName ?? "" }}
          onSubmit={({ name }) => onRename(name)}
          className="space-y-4"
        >
          <FormField name="name" label="New Name">
            <Input placeholder="filename.txt" />
          </FormField>
          <p className="text-xs text-muted-foreground">Current: {currentName}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
