import { formatLocaleDateTime, formatRelativeTime } from "@groot/shell/lib/utils";
import type { Job } from "../types";
import dayjs from "dayjs";

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "N/A";
  const duration = dayjs(end).diff(dayjs(start), "second", true);
  return `${duration.toFixed(2)}s`;
}

/** Read-only metadata grid for a job (priority, retries, timestamps, retention…). */
export function JobOverview({ job }: { job: Job }) {
  return (
    <div>
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        Overview
      </h2>
      <div className="border border-dashed p-4">
        <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
          <div>
            <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">Priority</dt>
            <dd className="text-sm font-medium mt-0.5 tabular-nums">{job.priority}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">Retries</dt>
            <dd className="text-sm font-medium mt-0.5 tabular-nums">
              {job.retrycount} / {job.retrylimit}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">Created</dt>
            <dd
              className="text-sm mt-0.5"
              title={job.createdon ? formatLocaleDateTime(job.createdon) : "N/A"}
            >
              {job.createdon ? formatRelativeTime(job.createdon) : "N/A"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">Started</dt>
            <dd
              className="text-sm mt-0.5"
              title={job.startedon ? formatLocaleDateTime(job.startedon) : "N/A"}
            >
              {job.startedon ? formatRelativeTime(job.startedon) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Completed
            </dt>
            <dd
              className="text-sm mt-0.5"
              title={job.completedon ? formatLocaleDateTime(job.completedon) : "N/A"}
            >
              {job.completedon ? formatRelativeTime(job.completedon) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">Duration</dt>
            <dd className="text-sm font-medium mt-0.5 tabular-nums">
              {formatDuration(job.startedon, job.completedon)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Retry Delay
            </dt>
            <dd className="text-sm font-medium mt-0.5">{job.retrydelay}s</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Retry Backoff
            </dt>
            <dd className="text-sm font-medium mt-0.5">{job.retrybackoff ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Expire In
            </dt>
            <dd className="text-sm font-medium mt-0.5">{job.expirein}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Keep Until
            </dt>
            <dd
              className="text-sm mt-0.5"
              title={job.keepuntil ? formatLocaleDateTime(job.keepuntil) : "N/A"}
            >
              {job.keepuntil ? formatRelativeTime(job.keepuntil) : "N/A"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
