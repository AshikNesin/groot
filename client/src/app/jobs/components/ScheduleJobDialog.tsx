import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import { JobTypeSelect } from "@/app/jobs/components/JobTypeSelect";
import type { JobTypeDialogFields } from "@/app/jobs/constants";
import { Calendar as CalendarIcon } from "lucide-react";

type Props = JobTypeDialogFields & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cron: string;
  onCronChange: (value: string) => void;
  data: string;
  onDataChange: (value: string) => void;
  onSubmit: () => void;
};

/** Schedule a recurring job on a cron expression. Renders its own trigger. */
export function ScheduleJobDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  cron,
  onCronChange,
  data,
  onDataChange,
  typeSearch,
  onTypeSearchChange,
  availableJobs,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <CalendarIcon className="w-3.5 h-3.5 md:mr-1.5" />
          <span className="hidden md:inline">Schedule</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Recurring Job</DialogTitle>
          <DialogDescription>Schedule a job to run on a recurring cron schedule</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="scheduled-job-name">Job Type</Label>
            <JobTypeSelect
              id="scheduled-job-name"
              value={name}
              onChange={onNameChange}
              search={typeSearch}
              onSearchChange={onTypeSearchChange}
              availableJobs={availableJobs}
            />
          </div>
          <div>
            <Label htmlFor="scheduled-job-cron">Cron Expression</Label>
            <Input
              id="scheduled-job-cron"
              value={cron}
              onChange={(e) => onCronChange(e.target.value)}
              placeholder="*/5 * * * *"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Example: "*/5 * * * *" runs every 5 minutes
            </p>
          </div>
          <div>
            <Label htmlFor="scheduled-job-data">Job Data (JSON)</Label>
            <Textarea
              id="scheduled-job-data"
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
            <Button onClick={onSubmit}>Schedule Job</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
