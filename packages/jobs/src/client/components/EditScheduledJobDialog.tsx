import { Button } from "@groot/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@groot/ui/dialog";
import { Input } from "@groot/ui/input";
import { Textarea } from "@groot/ui/textarea";
import { Field } from "@groot/ui/form";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  cron: string;
  onCronChange: (value: string) => void;
  data: string;
  onDataChange: (value: string) => void;
  onSubmit: () => void;
};

/** Edit an existing scheduled job's cron / data. No trigger (opened externally). */
export function EditScheduledJobDialog({
  open,
  onOpenChange,
  name,
  cron,
  onCronChange,
  data,
  onDataChange,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Scheduled Job</DialogTitle>
          <DialogDescription>Update cron schedule or data for "{name}"</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <Field
            label="Cron expression"
            htmlFor="edit-scheduled-cron"
            hint={`Example: "*/5 * * * *" runs every 5 minutes`}
          >
            <Input
              id="edit-scheduled-cron"
              value={cron}
              onChange={(e) => onCronChange(e.target.value)}
              placeholder="*/5 * * * *"
            />
          </Field>
          <Field label="Job data (JSON)" htmlFor="edit-scheduled-data">
            <Textarea
              id="edit-scheduled-data"
              value={data}
              onChange={(e) => onDataChange(e.target.value)}
              placeholder='{"key": "value"}'
              rows={10}
              className="font-mono text-sm"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
