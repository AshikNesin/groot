import { Card, CardContent, CardHeader, CardTitle } from "@groot/ui/card";
import { formatLocaleDateTime, formatRelativeTime } from "@groot/shell/lib/utils";
import type { Job } from "@groot/jobs/client/types";
import dayjs from "dayjs";

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "N/A";
  const duration = dayjs(end).diff(dayjs(start), "second", true);
  return `${duration.toFixed(2)}s`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground mt-1 tabular-nums">{children}</dd>
    </div>
  );
}

/** Read-only metadata grid for a job (priority, retries, timestamps, retention…). */
export function JobOverview({ job }: { job: Job }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          <Field label="Priority">{job.priority}</Field>
          <Field label="Retries">
            {job.retrycount} / {job.retrylimit}
          </Field>
          <Field label="Created">
            <span title={job.createdon ? formatLocaleDateTime(job.createdon) : "N/A"}>
              {job.createdon ? formatRelativeTime(job.createdon) : "N/A"}
            </span>
          </Field>
          <Field label="Started">
            <span title={job.startedon ? formatLocaleDateTime(job.startedon) : "N/A"}>
              {job.startedon ? formatRelativeTime(job.startedon) : "—"}
            </span>
          </Field>
          <Field label="Completed">
            <span title={job.completedon ? formatLocaleDateTime(job.completedon) : "N/A"}>
              {job.completedon ? formatRelativeTime(job.completedon) : "—"}
            </span>
          </Field>
          <Field label="Duration">{formatDuration(job.startedon, job.completedon)}</Field>
          <Field label="Retry Delay">{job.retrydelay}s</Field>
          <Field label="Retry Backoff">{job.retrybackoff ? "Yes" : "No"}</Field>
          <Field label="Expire In">{job.expirein}</Field>
          <Field label="Keep Until">
            <span title={job.keepuntil ? formatLocaleDateTime(job.keepuntil) : "N/A"}>
              {job.keepuntil ? formatRelativeTime(job.keepuntil) : "N/A"}
            </span>
          </Field>
        </dl>
      </CardContent>
    </Card>
  );
}
