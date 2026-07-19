import { Button } from "@groot/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@groot/ui/dialog";
import { Input } from "@groot/ui/input";
import { Textarea } from "@groot/ui/textarea";
import { Field } from "@groot/ui/form";
import { JobTypeSelect } from "./JobTypeSelect";
import type { JobTypeDialogFields } from "@groot/jobs/client/constants";
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
        <Button variant="outline" size="sm">
          <CalendarIcon className="size-4" />
          <span className="hidden md:inline">Schedule</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Recurring Job</DialogTitle>
          <DialogDescription>Schedule a job to run on a recurring cron schedule</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <Field label="Job type" htmlFor="scheduled-job-name">
            <JobTypeSelect
              id="scheduled-job-name"
              value={name}
              onChange={onNameChange}
              search={typeSearch}
              onSearchChange={onTypeSearchChange}
              availableJobs={availableJobs}
            />
          </Field>
          <Field
            label="Cron expression"
            htmlFor="scheduled-job-cron"
            hint={`Example: "*/5 * * * *" runs every 5 minutes`}
          >
            <Input
              id="scheduled-job-cron"
              value={cron}
              onChange={(e) => onCronChange(e.target.value)}
              placeholder="*/5 * * * *"
            />
          </Field>
          <Field label="Job data (JSON)" htmlFor="scheduled-job-data">
            <Textarea
              id="scheduled-job-data"
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
            <Button onClick={onSubmit}>Schedule Job</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
