import { Button } from "@groot/ui/button";
import { Card } from "@groot/ui/card";
import { cn } from "@groot/ui/lib/utils";
import type { ScheduledJob } from "@groot/jobs/client/types";
import { Pencil, Trash2 } from "lucide-react";
import { ScheduledJobsSkeleton } from "./skeletons";

type Props = {
  scheduledJobs: ScheduledJob[];
  loading?: boolean;
  onEdit: (job: ScheduledJob) => void;
  onCancel: (jobName: string, key?: string) => void;
};

const COLUMN_HEADER = "text-[11px] font-medium uppercase tracking-wider text-muted-foreground";

/** Scheduled (cron) jobs: desktop grid + mobile cards, with edit/cancel actions. */
export function ScheduledJobsPanel({ scheduledJobs, loading, onEdit, onCancel }: Props) {
  if (loading) {
    return <ScheduledJobsSkeleton />;
  }

  if (scheduledJobs.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">Scheduled jobs</span>
        <span className="text-xs text-muted-foreground">{scheduledJobs.length} total</span>
      </div>
      <Card className="gap-0 overflow-hidden p-0">
        <div className="hidden md:block">
          <div className="grid grid-cols-12 gap-4 border-b border-border/60 px-4 py-2.5">
            <div className={cn(COLUMN_HEADER, "col-span-3")}>Job name</div>
            <div className={cn(COLUMN_HEADER, "col-span-3")}>Schedule</div>
            <div className={cn(COLUMN_HEADER, "col-span-2")}>Timezone</div>
            <div className={cn(COLUMN_HEADER, "col-span-3")}>Data</div>
            <div className="col-span-1" />
          </div>
          <div className="divide-y divide-border/40">
            {scheduledJobs.map((job) => (
              <div
                key={`${job.name}-${job.key}`}
                className="grid grid-cols-12 items-center gap-4 px-4 py-3 text-sm group hover:bg-muted/40 transition-colors"
              >
                <div className="col-span-3 font-medium text-foreground">{job.name}</div>
                <div className="col-span-3 font-mono text-xs text-muted-foreground">{job.cron}</div>
                <div className="col-span-2 text-muted-foreground">{job.timezone || "UTC"}</div>
                <div className="col-span-3">
                  <pre className="font-mono text-[11px] bg-muted px-1.5 py-1 rounded truncate max-w-xs">
                    {JSON.stringify(job.data)}
                  </pre>
                </div>
                <div className="col-span-1 flex justify-end gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(job)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Edit schedule"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onCancel(job.name, job.key)}
                    className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Cancel schedule"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Mobile scheduled cards */}
        <div className="md:hidden divide-y divide-border/40">
          {scheduledJobs.map((job) => (
            <div key={`${job.name}-${job.key}`} className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{job.name}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onCancel(job.name, job.key)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
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
      </Card>
    </div>
  );
}
