import { Card, CardContent, CardHeader } from "@groot/ui/card";
import { Skeleton } from "@groot/ui/loading-skeleton";
import { cn } from "@groot/ui/lib/utils";

/**
 * Reusable skeleton building blocks for the jobs UI. Centralised here so every
 * loading surface (list, detail, stats, scheduled) shares the same shapes and
 * can be updated in one place.
 */

/** A small label + value pair, matching the {@link JobOverview} field layout. */
function FieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

/** A Card titled via a skeleton, wrapping skeleton body content. */
function CardSkeleton({
  titleWidth = "w-20",
  children,
}: {
  titleWidth?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className={cn("h-4", titleWidth)} />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Skeleton for the {@link JobsStats} clickable stat row. */
export function JobsStatsSkeleton({ count = 7 }: { count?: number }) {
  return (
    <Card size="sm" className="flex flex-row flex-wrap items-stretch gap-0 p-0">
      {[...Array(count)].map((_, idx) => (
        <div
          key={idx.toString()}
          className={cn(
            "flex min-w-[7rem] flex-1 flex-col gap-2 px-4 py-3",
            idx !== 0 && "border-l border-border/60",
          )}
        >
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-10" />
        </div>
      ))}
    </Card>
  );
}

/** A single jobs-table row skeleton, matching the {@link JobsTable} grid. */
export function JobRowSkeleton() {
  return (
    <div className="grid grid-cols-12 items-center gap-4 px-4 py-3 sm:px-5">
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
  );
}

/** Skeleton for the {@link JobsTable} header + rows while the list loads. */
export function JobsTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div>
      <div className="grid grid-cols-12 gap-4 border-b border-border/60 px-4 py-2.5 sm:px-5">
        <div className="col-span-5">
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="col-span-2">
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="col-span-2">
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="col-span-2">
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="col-span-1" />
      </div>
      <div className="divide-y divide-border/40">
        {[...Array(rows)].map((_, i) => (
          <JobRowSkeleton key={i.toString()} />
        ))}
      </div>
    </div>
  );
}

/** Skeleton for the {@link ScheduledJobsPanel} while scheduled jobs load. */
export function ScheduledJobsSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Card className="gap-0 overflow-hidden p-0">
        <div className="divide-y divide-border/40">
          {[...Array(rows)].map((_, i) => (
            <div key={i.toString()} className="grid grid-cols-12 items-center gap-4 px-4 py-3">
              <Skeleton className="col-span-3 h-4" />
              <Skeleton className="col-span-3 h-4" />
              <Skeleton className="col-span-2 h-4" />
              <Skeleton className="col-span-3 h-4" />
              <div className="col-span-1" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/** Skeleton for the {@link JobDetail} page while a job loads. */
export function JobDetailSkeleton() {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-48 font-mono" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="mt-8 space-y-6">
        <CardSkeleton titleWidth="w-20">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
            {[...Array(8)].map((_, i) => (
              <FieldSkeleton key={i.toString()} />
            ))}
          </div>
        </CardSkeleton>
        <CardSkeleton titleWidth="w-16">
          <Skeleton className="h-48 w-full" />
        </CardSkeleton>
        <CardSkeleton titleWidth="w-12">
          <Skeleton className="h-40 w-full" />
        </CardSkeleton>
      </div>
    </>
  );
}
