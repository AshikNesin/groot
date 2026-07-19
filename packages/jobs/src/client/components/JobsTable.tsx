import { Button } from "@groot/ui/button";
import { Card } from "@groot/ui/card";
import { Checkbox } from "@groot/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@groot/ui/dropdown-menu";
import { Skeleton } from "@groot/ui/loading-skeleton";
import { StatusBadge } from "@groot/ui";
import { cn } from "@groot/ui/lib/utils";
import { formatDuration, formatLocaleDateTime, formatRelativeTime } from "@groot/shell/lib/utils";
import { formatJobId } from "@groot/jobs/client/utils";
import type { Job } from "@groot/jobs/client/types";
import type { JobsQueryPatch } from "@groot/jobs/client/constants";
import {
  AlertCircle,
  ChevronRight,
  FileText,
  MoreVertical,
  Play,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

function formatJobDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "N/A";
  return formatDuration(start, end);
}

type QueryParams = {
  state: string;
  page: number;
};

type JobActions = {
  onRetry: (queueName: string, jobId: string) => void;
  onRerun: (queueName: string, jobId: string) => void;
  onResume: (queueName: string, jobId: string) => void;
  onCancel: (queueName: string, jobId: string) => void;
  onDelete: (queueName: string, jobId: string) => void;
};

type Props = {
  jobs: Job[];
  loading: boolean;
  total: number;
  error?: string | null;
  onErrorRetry?: () => void;
  queryParams: QueryParams;
  setQueryParams: (patch: JobsQueryPatch) => void;
  selectedJobs: Set<string>;
  toggleJobSelection: (queueName: string, jobId: string) => void;
  toggleSelectAll: () => void;
  handleBulkRerun: () => void;
  handlePurge: (state: string) => void;
} & JobActions;

const COLUMN_HEADER = "text-[11px] font-medium uppercase tracking-wider text-muted-foreground";

/** Jobs list: bulk-action bar + desktop grid table + mobile cards + pagination. */
export function JobsTable({
  jobs,
  loading,
  total,
  error,
  onErrorRetry,
  queryParams,
  setQueryParams,
  selectedJobs,
  toggleJobSelection,
  toggleSelectAll,
  handleBulkRerun,
  handlePurge,
  onRetry,
  onRerun,
  onResume,
  onCancel,
  onDelete,
}: Props) {
  const pageSize = 50;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {queryParams.state === "all" ? "All jobs" : `${queryParams.state} jobs`}
          </span>
          <span className="text-xs text-muted-foreground">
            {jobs.length} of {total}
          </span>
        </div>
        <div className="flex gap-2">
          {selectedJobs.size > 0 && (
            <Button variant="outline" size="sm" onClick={handleBulkRerun}>
              <Play className="size-3.5" />
              Rerun {selectedJobs.size}
            </Button>
          )}
          {queryParams.state !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePurge(queryParams.state)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Purge {queryParams.state}
            </Button>
          )}
        </div>
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        {error && jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="size-5 text-destructive" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Couldn't load jobs</h3>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            {onErrorRetry && (
              <Button variant="outline" size="sm" className="mt-4" onClick={onErrorRetry}>
                <RefreshCw className="size-3.5" />
                Retry
              </Button>
            )}
          </div>
        ) : loading && jobs.length === 0 ? (
          <div>
            <div className="grid grid-cols-12 gap-4 border-b border-border/60 px-4 py-2.5 sm:px-5">
              <div className={cn(COLUMN_HEADER, "col-span-5")}>Job</div>
              <div className={cn(COLUMN_HEADER, "col-span-2")}>Status</div>
              <div className={cn(COLUMN_HEADER, "col-span-2")}>Created</div>
              <div className={cn(COLUMN_HEADER, "col-span-2")}>Started</div>
              <div className="col-span-1" />
            </div>
            <div className="divide-y divide-border/40">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i.toString()}
                  className="grid grid-cols-12 items-center gap-4 px-4 py-3 sm:px-5"
                >
                  <div className="col-span-5 flex items-center gap-3">
                    <Skeleton className="size-4 rounded" />
                    <Skeleton className="size-4 rounded" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="col-span-2">
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="col-span-2">
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Skeleton className="size-4 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground">No jobs found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {queryParams.state !== "all" ? `No ${queryParams.state} jobs` : "The queue is empty"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: CSS Grid Table */}
            <div className="hidden md:block">
              <div className="grid grid-cols-12 gap-4 border-b border-border/60 px-4 py-2.5">
                <div className={cn(COLUMN_HEADER, "col-span-5 flex items-center gap-3")}>
                  <Checkbox
                    checked={jobs.length > 0 && selectedJobs.size === jobs.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                    className="size-3.5"
                  />
                  <span>Job</span>
                </div>
                <div className={cn(COLUMN_HEADER, "col-span-2")}>Status</div>
                <div className={cn(COLUMN_HEADER, "col-span-2")}>Created</div>
                <div className={cn(COLUMN_HEADER, "col-span-2")}>Started</div>
                <div className="col-span-1" />
              </div>
              <div className="divide-y divide-border/40">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.name}/${job.id}`}
                    className="group grid grid-cols-12 items-center gap-4 px-4 py-3 text-sm hover:bg-muted/40 transition-colors"
                  >
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={selectedJobs.has(
                          JSON.stringify({ queueName: job.name, jobId: job.id }),
                        )}
                        onCheckedChange={() => toggleJobSelection(job.name, job.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="size-3.5"
                      />
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{job.name}</div>
                        <div className="truncate font-mono text-xs text-muted-foreground">
                          {formatJobId(job.id)}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <StatusBadge status={job.state} />
                    </div>
                    <div
                      className="col-span-2 text-muted-foreground"
                      title={job.createdon ? formatLocaleDateTime(job.createdon) : "N/A"}
                    >
                      {job.createdon ? formatRelativeTime(job.createdon) : "N/A"}
                    </div>
                    <div
                      className="col-span-2 text-muted-foreground"
                      title={job.startedon ? formatLocaleDateTime(job.startedon) : "N/A"}
                    >
                      {job.startedon ? formatRelativeTime(job.startedon) : "—"}
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          {job.state === "failed" && (
                            <DropdownMenuItem onClick={() => onRetry(job.name, job.id)}>
                              <RefreshCw className="size-3.5" />
                              Retry
                            </DropdownMenuItem>
                          )}
                          {(job.state === "completed" || job.state === "failed") && (
                            <DropdownMenuItem onClick={() => onRerun(job.name, job.id)}>
                              <Play className="size-3.5" />
                              Re-run
                            </DropdownMenuItem>
                          )}
                          {job.state === "cancelled" && (
                            <DropdownMenuItem onClick={() => onResume(job.name, job.id)}>
                              <Play className="size-3.5" />
                              Resume
                            </DropdownMenuItem>
                          )}
                          {(job.state === "active" ||
                            job.state === "created" ||
                            job.state === "retry") && (
                            <DropdownMenuItem onClick={() => onCancel(job.name, job.id)}>
                              <X className="size-3.5" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => onDelete(job.name, job.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile: Card View */}
            <div className="md:hidden divide-y divide-border/40">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.name}/${job.id}`}
                  className="block px-4 py-3 space-y-2 active:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{job.name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground mt-0.5 truncate">
                          {formatJobId(job.id)}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={job.state} />
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className="text-muted-foreground">Created</span>
                      <div className="font-medium mt-0.5">
                        {job.createdon ? formatRelativeTime(job.createdon) : "N/A"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Started</span>
                      <div className="font-medium mt-0.5">
                        {job.startedon ? formatRelativeTime(job.startedon) : "—"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Retries</span>
                      <div className="font-medium mt-0.5">
                        {job.retrycount}/{job.retrylimit}
                      </div>
                    </div>
                    {job.startedon && (
                      <div>
                        <span className="text-muted-foreground">Duration</span>
                        <div className="font-medium mt-0.5">
                          {formatJobDuration(job.startedon, job.completedon)}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            Page {queryParams.page + 1} of {Math.ceil(total / pageSize)}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQueryParams({ page: Math.max(0, queryParams.page - 1) })}
              disabled={queryParams.page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQueryParams({ page: queryParams.page + 1 })}
              disabled={(queryParams.page + 1) * pageSize >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
