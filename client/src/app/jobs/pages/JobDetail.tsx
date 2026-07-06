import { Button } from "@/ui/button";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { StatusBadge } from "@/ui";
import { formatLocaleDateTime, formatRelativeTime } from "@/core/lib/utils";
import { JobActions } from "@/app/jobs/components/JobActions";
import { JobJsonBlock } from "@/app/jobs/components/JobJsonBlock";
import { JobLogs } from "@/app/jobs/components/JobLogs";
import { JobOverview } from "@/app/jobs/components/JobOverview";
import { useJobDetail } from "@/app/jobs/hooks/useJobDetail";
import { AlertCircle, ArrowLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export function JobDetail() {
  const navigate = useNavigate();
  const { job, loading, error, logs, retry, cancel, resume, deleteJob, rerun } = useJobDetail();

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <LoadingSpinner size="lg" className="py-20" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/jobs")} className="mb-4 -ml-2 text-xs">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Jobs
        </Button>
        <div className="text-center py-20">
          <div className="bg-muted p-3 mb-3 inline-block">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-medium text-foreground mb-2">Job Not Found</h2>
          <p className="text-xs text-muted-foreground">
            {error || "The job you are looking for does not exist."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb + Header */}
      <div className="mb-6">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Link to="/jobs" className="hover:text-foreground">
            Jobs
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">{job.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{job.name}</h1>
              <StatusBadge status={job.state} />
            </div>
            <p className="font-mono text-[11px] text-muted-foreground mt-1 truncate">{job.id}</p>
          </div>
          <JobActions
            state={job.state}
            onRetry={retry}
            onRerun={rerun}
            onResume={resume}
            onCancel={cancel}
            onDelete={deleteJob}
          />
        </div>
      </div>

      <div className="space-y-6">
        <JobOverview job={job} />

        <JobJsonBlock label="Data" value={job.data} />

        {job.output && <JobJsonBlock label="Output" value={job.output} />}

        {/* Error Details */}
        {job.deadletter && (
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-destructive mb-3">
              Error
            </h2>
            <pre className="p-4 bg-destructive/10 border border-destructive/30 text-xs overflow-x-auto text-destructive whitespace-pre-wrap">
              {job.deadletter}
            </pre>
          </div>
        )}

        {/* Singleton Info */}
        {(job.singletonkey || job.singletonon) && (
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Singleton
            </h2>
            <div className="border border-dashed p-4">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                {job.singletonkey && (
                  <div>
                    <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      Key
                    </dt>
                    <dd className="font-mono text-sm mt-0.5">{job.singletonkey}</dd>
                  </div>
                )}
                {job.singletonon && (
                  <div>
                    <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      On
                    </dt>
                    <dd className="text-sm mt-0.5" title={formatLocaleDateTime(job.singletonon)}>
                      {formatRelativeTime(job.singletonon)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        <JobLogs logs={logs} />
      </div>
    </div>
  );
}
