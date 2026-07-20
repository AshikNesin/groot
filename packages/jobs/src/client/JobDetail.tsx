import { Button } from "@groot/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@groot/ui/card";
import { Skeleton } from "@groot/ui/loading-skeleton";
import { StatusBadge } from "@groot/ui";
import { PageContainer } from "@groot/shell/components/layout/PageContainer";
import { formatLocaleDateTime, formatRelativeTime } from "@groot/shell/lib/utils";
import { JobActions } from "./components/JobActions";
import { JobJsonBlock } from "./components/JobJsonBlock";
import { JobLogs } from "./components/JobLogs";
import { JobOverview } from "./components/JobOverview";
import { JobDetailSkeleton } from "./components/skeletons";
import { useJobDetail } from "./useJobDetail";
import { AlertCircle, ArrowLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export function JobDetail() {
  const navigate = useNavigate();
  const { job, loading, error, logs, retry, cancel, resume, deleteJob, rerun } = useJobDetail();

  if (loading) {
    return (
      <PageContainer maxWidth="5xl">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Skeleton className="h-4 w-10" />
          <ChevronRight className="size-3.5" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="mt-4">
          <JobDetailSkeleton />
        </div>
      </PageContainer>
    );
  }

  if (error || !job) {
    return (
      <PageContainer maxWidth="5xl">
        <Button variant="ghost" onClick={() => navigate("/jobs")} className="mb-4 -ml-2">
          <ArrowLeft className="size-4" />
          Back to Jobs
        </Button>
        <div className="text-center py-20">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="size-6 text-muted-foreground" />
          </div>
          <h2 className="text-base font-medium text-foreground mb-1">Job Not Found</h2>
          <p className="text-sm text-muted-foreground">
            {error || "The job you are looking for does not exist."}
          </p>
        </div>
      </PageContainer>
    );
  }

  const actions = (
    <JobActions
      state={job.state}
      onRetry={retry}
      onRerun={rerun}
      onResume={resume}
      onCancel={cancel}
      onDelete={deleteJob}
    />
  );

  return (
    <PageContainer maxWidth="5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/jobs" className="hover:text-foreground">
          Jobs
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{job.name}</span>
      </div>

      {/* Header */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {job.name}
            </h1>
            <StatusBadge status={job.state} />
          </div>
          <p className="font-mono text-xs text-muted-foreground mt-1.5 truncate">{job.id}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
      </div>

      <div className="mt-8 space-y-6">
        <JobOverview job={job} />

        <JobJsonBlock label="Data" value={job.data} />

        {job.output && <JobJsonBlock label="Output" value={job.output} />}

        {/* Error Details */}
        {job.deadletter && (
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-destructive/10 p-4 text-xs text-destructive">
                {job.deadletter}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Singleton Info */}
        {(job.singletonkey || job.singletonon) && (
          <Card>
            <CardHeader>
              <CardTitle>Singleton</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                {job.singletonkey && (
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Key
                    </dt>
                    <dd className="font-mono text-sm mt-1">{job.singletonkey}</dd>
                  </div>
                )}
                {job.singletonon && (
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      On
                    </dt>
                    <dd className="text-sm mt-1" title={formatLocaleDateTime(job.singletonon)}>
                      {formatRelativeTime(job.singletonon)}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        <JobLogs logs={logs} />
      </div>
    </PageContainer>
  );
}
