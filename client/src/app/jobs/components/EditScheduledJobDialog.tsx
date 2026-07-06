import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";

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
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-scheduled-cron">Cron Expression</Label>
            <Input
              id="edit-scheduled-cron"
              value={cron}
              onChange={(e) => onCronChange(e.target.value)}
              placeholder="*/5 * * * *"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Example: "*/5 * * * *" runs every 5 minutes
            </p>
          </div>
          <div>
            <Label htmlFor="edit-scheduled-data">Job Data (JSON)</Label>
            <Textarea
              id="edit-scheduled-data"
              value={data}
              onChange={(e) => onDataChange(e.target.value)}
              placeholder='{"key": "value"}'
              rows={10}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
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
