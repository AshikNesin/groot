import { Button } from "@groot/ui/button";
import type { ScheduledJob } from "@groot/client/types/jobs";
import { Pencil, Trash2 } from "lucide-react";

type Props = {
  scheduledJobs: ScheduledJob[];
  onEdit: (job: ScheduledJob) => void;
  onCancel: (jobName: string, key?: string) => void;
};

/** Scheduled (cron) jobs: desktop grid + mobile cards, with edit/cancel actions. */
export function ScheduledJobsPanel({ scheduledJobs, onEdit, onCancel }: Props) {
  if (scheduledJobs.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Scheduled jobs
        </span>
        <span className="text-xs text-muted-foreground">{scheduledJobs.length} total</span>
      </div>
      <div className="hidden md:block">
        <div className="grid grid-cols-12 gap-4 border-b border-dashed py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="col-span-3">Job name</div>
          <div className="col-span-3">Schedule</div>
          <div className="col-span-2">Timezone</div>
          <div className="col-span-3">Data</div>
          <div className="col-span-1" />
        </div>
        <div className="divide-y divide-border/50">
          {scheduledJobs.map((job) => (
            <div
              key={`${job.name}-${job.key}`}
              className="grid grid-cols-12 items-center gap-4 py-3 text-sm group"
            >
              <div className="col-span-3 font-medium">{job.name}</div>
              <div className="col-span-3 font-mono text-xs text-muted-foreground">{job.cron}</div>
              <div className="col-span-2 text-muted-foreground">{job.timezone || "UTC"}</div>
              <div className="col-span-3">
                <pre className="font-mono text-[11px] bg-muted p-1.5 rounded truncate max-w-xs">
                  {JSON.stringify(job.data)}
                </pre>
              </div>
              <div className="col-span-1 flex justify-end gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(job)}
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit schedule"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancel(job.name, job.key)}
                  className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Cancel schedule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Mobile scheduled cards */}
      <div className="md:hidden space-y-2">
        {scheduledJobs.map((job) => (
          <div
            key={`${job.name}-${job.key}`}
            className="border border-border rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{job.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(job.name, job.key)}
                className="h-7 w-7 p-0 text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">Schedule: </span>
                <span className="font-mono">{job.cron}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Data: </span>
                <span className="font-mono text-[11px]">{JSON.stringify(job.data)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
