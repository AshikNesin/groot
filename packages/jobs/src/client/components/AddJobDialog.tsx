import { Button } from "@groot/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@groot/ui/dialog";
import { Label } from "@groot/ui/label";
import { JobTypeSelect } from "./JobTypeSelect";
import type { JobTypeDialogFields } from "../constants";
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
        <div className="space-y-4">
          <div>
            <Label htmlFor="job-name">Job Type</Label>
            <JobTypeSelect
              id="job-name"
              value={name}
              onChange={onNameChange}
              search={typeSearch}
              onSearchChange={onTypeSearchChange}
              availableJobs={availableJobs}
            />
          </div>
          <div>
            <Label htmlFor="job-data">Job Data (JSON)</Label>
            <div className="mt-1 overflow-hidden rounded-md border">
              <Suspense fallback={<div className="h-[200px]" />}>
                <CodeMirrorEditor value={data} height="200px" onChange={onDataChange} />
              </Suspense>
            </div>
          </div>
          <div className="flex justify-end gap-2">
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
