import { Button } from "@groot/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@groot/ui/dialog";
import { Field } from "@groot/ui/form";
import { JobTypeSelect } from "./JobTypeSelect";
import type { JobTypeDialogFields } from "@groot/jobs/client/constants";
import { lazy, Suspense } from "react";
import { Plus } from "lucide-react";

const CodeMirrorEditor = lazy(() =>
  import("@groot/shell/components/CodeMirrorEditor").then((m) => ({
    default: m.CodeMirrorEditor,
  })),
);

type Props = JobTypeDialogFields & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: string;
  onDataChange: (value: string) => void;
  onSubmit: () => void;
};

/** Manually trigger a one-off job. Renders its own trigger. */
export function AddJobDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
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
        <Button size="sm" className="h-8 text-xs">
          <Plus className="w-3.5 h-3.5 md:mr-1.5" />
          <span className="hidden md:inline">Add Job</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Job</DialogTitle>
          <DialogDescription>Manually trigger a background job</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <Field label="Job type" htmlFor="job-name">
            <JobTypeSelect
              id="job-name"
              value={name}
              onChange={onNameChange}
              search={typeSearch}
              onSearchChange={onTypeSearchChange}
              availableJobs={availableJobs}
            />
          </Field>
          <Field
            label="Job data (JSON)"
            htmlFor="job-data"
            hint="The payload passed to the job handler."
          >
            <div className="overflow-hidden rounded-md border">
              <Suspense fallback={<div className="h-[200px]" />}>
                <CodeMirrorEditor value={data} height="200px" onChange={onDataChange} />
              </Suspense>
            </div>
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit}>Add Job</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
