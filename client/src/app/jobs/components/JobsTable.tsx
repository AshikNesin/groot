import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Skeleton } from "@/ui/loading-skeleton";
import { StatusBadge } from "@/ui";
import { formatDuration, formatLocaleDateTime, formatRelativeTime } from "@/core/lib/utils";
import type { Job } from "@/core/types/jobs";
import type { JobsQueryPatch } from "@/app/jobs/constants";
import { ChevronRight, FileText, MoreVertical, Play, RefreshCw, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";

function formatDate(date: string | null): string {
  if (!date) return "N/A";
  return formatLocaleDateTime(date);
}

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
  queryParams: QueryParams;
  setQueryParams: (patch: JobsQueryPatch) => void;
  selectedJobs: Set<string>;
  toggleJobSelection: (queueName: string, jobId: string) => void;
  toggleSelectAll: () => void;
  handleBulkRerun: () => void;
  handlePurge: (state: string) => void;
} & JobActions;

/** Jobs list: bulk-action bar + desktop grid table + mobile cards + pagination. */
export function JobsTable({
  jobs,
  loading,
  total,
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
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {queryParams.state === "all" ? "All jobs" : `${queryParams.state} jobs`}
            </span>
            <span className="text-xs text-muted-foreground">
              Showing {jobs.length} of {total}
            </span>
          </div>
          <div className="flex gap-2">
            {selectedJobs.size > 0 && (
              <Button variant="outline" size="sm" onClick={handleBulkRerun} className="h-7 text-xs">
                <Play className="w-3 h-3 md:mr-1.5" />
                Rerun {selectedJobs.size}
              </Button>
            )}
            {queryParams.state !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePurge(queryParams.state)}
                className="h-7 text-xs text-destructive"
              >
                <Trash2 className="w-3 h-3 md:mr-1.5" />
                Purge {queryParams.state}
              </Button>
            )}
          </div>
        </div>

        {loading && jobs.length === 0 ? (
          <div className="divide-y divide-border/50">
            <div className="grid grid-cols-12 gap-4 border-b border-dashed py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <div className="col-span-5">Job</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-2">Started</div>
              <div className="col-span-1" />
            </div>
            {[...Array(12)].map((_, i) => (
              <div key={i.toString()} className="grid grid-cols-12 items-center gap-4 py-3">
                <div className="col-span-5 flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-4 rounded" />
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
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted p-3 mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-sm text-foreground">No jobs found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {queryParams.state !== "all" ? `No ${queryParams.state} jobs` : "The queue is empty"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: CSS Grid Table */}
            <div className="hidden md:block">
              <div className="grid grid-cols-12 gap-4 border-b border-dashed py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="col-span-5 flex items-center gap-3">
                  <Checkbox
                    checked={jobs.length > 0 && selectedJobs.size === jobs.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                    className="h-3.5 w-3.5"
                  />
                  <span>Job</span>
                </div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Created</div>
                <div className="col-span-2">Started</div>
                <div className="col-span-1" />
              </div>
              <div className="divide-y divide-border/50">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.name}/${job.id}`}
                    className="group grid grid-cols-12 items-center gap-4 py-3 text-sm hover:bg-accent/30 transition-colors"
                  >
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={selectedJobs.has(
                          JSON.stringify({ queueName: job.name, jobId: job.id }),
                        )}
                        onCheckedChange={() => toggleJobSelection(job.name, job.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5"
                      />
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{job.name}</div>
                        <div className="truncate font-mono text-xs text-muted-foreground">
                          {job.id.substring(0, 12)}...
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <StatusBadge status={job.state} />
                    </div>
                    <div
                      className="col-span-2 text-muted-foreground"
                      title={formatDate(job.createdon)}
                    >
                      {job.createdon ? formatRelativeTime(job.createdon) : "N/A"}
                    </div>
                    <div
                      className="col-span-2 text-muted-foreground"
                      title={formatDate(job.startedon)}
                    >
                      {job.startedon ? formatRelativeTime(job.startedon) : "—"}
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          {job.state === "failed" && (
                            <DropdownMenuItem onClick={() => onRetry(job.name, job.id)}>
                              <RefreshCw className="w-3.5 h-3.5 mr-2" />
                              Retry
                            </DropdownMenuItem>
                          )}
                          {(job.state === "completed" || job.state === "failed") && (
                            <DropdownMenuItem onClick={() => onRerun(job.name, job.id)}>
                              <Play className="w-3.5 h-3.5 mr-2" />
                              Re-run
                            </DropdownMenuItem>
                          )}
                          {job.state === "cancelled" && (
                            <DropdownMenuItem onClick={() => onResume(job.name, job.id)}>
                              <Play className="w-3.5 h-3.5 mr-2" />
                              Resume
                            </DropdownMenuItem>
                          )}
                          {(job.state === "active" ||
                            job.state === "created" ||
                            job.state === "retry") && (
                            <DropdownMenuItem onClick={() => onCancel(job.name, job.id)}>
                              <X className="w-3.5 h-3.5 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => onDelete(job.name, job.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile: Card View */}
            <div className="md:hidden space-y-2">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.name}/${job.id}`}
                  className="block border border-border rounded-lg p-3 space-y-2 active:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{job.name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground mt-0.5 truncate">
                          {job.id.substring(0, 16)}...
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

            {/* Pagination */}
            {total > pageSize && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-xs text-muted-foreground">
                  Page {queryParams.page + 1} of {Math.ceil(total / pageSize)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQueryParams({ page: Math.max(0, queryParams.page - 1) })}
                    disabled={queryParams.page === 0}
                    className="h-7 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQueryParams({ page: queryParams.page + 1 })}
                    disabled={(queryParams.page + 1) * pageSize >= total}
                    className="h-7 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
