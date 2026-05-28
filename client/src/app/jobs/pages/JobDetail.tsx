import { Button } from "@/ui/button";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { useToast } from "@/core/hooks/use-toast";
import { formatLocaleDateTime, formatRelativeTime } from "@/core/lib/utils";
import { apiClient } from "@/core/lib/api";
import type { Job, JobLog } from "@/core/types/jobs";
import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { Console } from "console-feed";
import dayjs from "dayjs";
import { AlertCircle, ArrowLeft, ChevronRight, Play, RefreshCw, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const stateDotClass: Record<string, string> = {
  active: "bg-blue-500",
  created: "bg-gray-400",
  retry: "bg-yellow-500",
  failed: "bg-red-500",
  completed: "bg-green-500",
  cancelled: "bg-gray-400",
  expired: "bg-red-400",
};

const stateTextClass: Record<string, string> = {
  active: "text-blue-600",
  created: "text-gray-600",
  retry: "text-yellow-600",
  failed: "text-red-600",
  completed: "text-green-600",
  cancelled: "text-gray-500",
  expired: "text-red-500",
};

const stateBgClass: Record<string, string> = {
  active: "bg-blue-50",
  created: "bg-gray-50",
  retry: "bg-yellow-50",
  failed: "bg-red-50",
  completed: "bg-green-50",
  cancelled: "bg-gray-50",
  expired: "bg-red-50",
};

function DotBadge({ state }: { state: string }) {
  const dot = stateDotClass[state] || "bg-gray-400";
  const text = stateTextClass[state] || "text-gray-600";
  const bg = stateBgClass[state] || "bg-gray-50";

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium ${bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className={text}>{state.charAt(0).toUpperCase() + state.slice(1)}</span>
    </span>
  );
}

export function JobDetail() {
  const { queueName, jobId } = useParams<{
    queueName: string;
    jobId: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const jsonExtension = useMemo(() => json(), []);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const lastLogIdRef = useRef<number>(0);
  const activeJobRef = useRef<string>("");

  useEffect(() => {
    const jobKey = `${queueName}/${jobId}`;
    activeJobRef.current = jobKey;
    setLogs([]);
    lastLogIdRef.current = 0;

    loadJob();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [queueName, jobId]);

  const fetchLogs = async () => {
    if (!queueName || !jobId) return;
    const jobKey = `${queueName}/${jobId}`;
    try {
      const currentLastId = lastLogIdRef.current;
      const newLogs = await apiClient.getJobLogs(queueName, jobId, currentLastId);
      if (activeJobRef.current !== jobKey) return;
      if (newLogs.length > 0) {
        setLogs((prevLogs) => [...prevLogs, ...newLogs]);
        const maxId = Math.max(...newLogs.map((l) => l.id));
        lastLogIdRef.current = Math.max(currentLastId, maxId);
      }
    } catch (err) {
      if (activeJobRef.current !== jobKey) return;
      console.error("Failed to fetch logs", err);
    }
  };

  const loadJob = async () => {
    if (!queueName || !jobId) return;

    try {
      setLoading(true);
      setError(null);
      const jobData = await apiClient.getJob(queueName, jobId);
      setJob(jobData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job");
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load job",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!job) return;

    try {
      await apiClient.retryJob(job.name, job.id);
      toast({
        title: "Success",
        description: "Job has been queued for retry",
      });
      loadJob();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to retry job",
      });
    }
  };

  const handleCancel = async () => {
    if (!job) return;

    try {
      await apiClient.cancelJob(job.name, job.id);
      toast({
        title: "Success",
        description: "Job has been cancelled",
      });
      loadJob();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel job",
      });
    }
  };

  const handleResume = async () => {
    if (!job) return;

    try {
      await apiClient.resumeJob(job.name, job.id);
      toast({
        title: "Success",
        description: "Job has been resumed",
      });
      loadJob();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resume job",
      });
    }
  };

  const handleDelete = async () => {
    if (!job) return;

    if (
      !window.confirm("Are you sure you want to delete this job? This action cannot be undone.")
    ) {
      return;
    }

    try {
      await apiClient.deleteJob(job.name, job.id);
      toast({
        title: "Success",
        description: "Job has been deleted",
      });
      navigate("/jobs");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete job",
      });
    }
  };

  const handleRerun = async () => {
    if (!job) return;

    try {
      const result = await apiClient.rerunJob(job.name, job.id);
      toast({
        title: "Success",
        description: (
          <span>
            Job re-run created.{" "}
            <Link
              to={`/jobs/${result.queueName}/${result.newJobId}`}
              className="underline font-medium hover:text-gray-900"
            >
              View new job ({result.newJobId.substring(0, 8)}...)
            </Link>
          </span>
        ),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to re-run job",
      });
    }
  };

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return "N/A";
    const duration = dayjs(end).diff(dayjs(start), "second", true);
    return `${duration.toFixed(2)}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSpinner size="lg" className="py-20" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button variant="ghost" onClick={() => navigate("/jobs")} className="mb-4 -ml-2 text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Jobs
          </Button>
          <div className="text-center py-20">
            <div className="bg-muted p-3 mb-3 inline-block">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-medium text-gray-900 mb-2">Job Not Found</h2>
            <p className="text-xs text-muted-foreground">
              {error || "The job you are looking for does not exist."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                <h1 className="text-lg font-semibold text-gray-900">{job.name}</h1>
                <DotBadge state={job.state} />
              </div>
              <p className="font-mono text-[11px] text-muted-foreground mt-1 truncate">{job.id}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {job.state === "failed" && (
                <Button variant="outline" onClick={handleRetry} size="sm" className="h-7 text-xs">
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  Retry
                </Button>
              )}
              {(job.state === "completed" || job.state === "failed") && (
                <Button variant="outline" onClick={handleRerun} size="sm" className="h-7 text-xs">
                  <Play className="w-3 h-3 mr-1.5" />
                  Re-run
                </Button>
              )}
              {job.state === "cancelled" && (
                <Button variant="outline" onClick={handleResume} size="sm" className="h-7 text-xs">
                  <Play className="w-3 h-3 mr-1.5" />
                  Resume
                </Button>
              )}
              {(job.state === "active" || job.state === "created" || job.state === "retry") && (
                <Button variant="outline" onClick={handleCancel} size="sm" className="h-7 text-xs">
                  <X className="w-3 h-3 mr-1.5" />
                  Cancel
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleDelete}
                size="sm"
                className="h-7 text-xs text-destructive"
              >
                <Trash2 className="w-3 h-3 mr-1.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Job Overview */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Overview
            </h2>
            <div className="border border-dashed p-4">
              <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Priority
                  </dt>
                  <dd className="text-sm font-medium mt-0.5 tabular-nums">{job.priority}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Retries
                  </dt>
                  <dd className="text-sm font-medium mt-0.5 tabular-nums">
                    {job.retrycount} / {job.retrylimit}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Created
                  </dt>
                  <dd
                    className="text-sm mt-0.5"
                    title={job.createdon ? formatLocaleDateTime(job.createdon) : "N/A"}
                  >
                    {job.createdon ? formatRelativeTime(job.createdon) : "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Started
                  </dt>
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
                  <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Duration
                  </dt>
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

          {/* Job Data */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Data
            </h2>
            <div className="border border-dashed overflow-hidden">
              <CodeMirror
                value={JSON.stringify(job.data, null, 2)}
                extensions={[jsonExtension, EditorView.lineWrapping]}
                editable={false}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  highlightActiveLineGutter: false,
                  highlightActiveLine: false,
                }}
              />
            </div>
          </div>

          {/* Job Output */}
          {job.output && (
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Output
              </h2>
              <div className="border border-dashed overflow-hidden">
                <CodeMirror
                  value={JSON.stringify(job.output, null, 2)}
                  extensions={[jsonExtension, EditorView.lineWrapping]}
                  editable={false}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLineGutter: false,
                    highlightActiveLine: false,
                  }}
                />
              </div>
            </div>
          )}

          {/* Error Details */}
          {job.deadletter && (
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wider text-red-600 mb-3">
                Error
              </h2>
              <pre className="p-4 bg-red-50 border border-red-200 text-xs overflow-x-auto text-red-900 whitespace-pre-wrap">
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

          {/* Real-time Logs */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Logs
            </h2>
            <div className="bg-gray-50 border border-dashed overflow-hidden max-h-[400px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="p-4 text-muted-foreground italic text-xs">No logs available</div>
              ) : (
                <Console
                  logs={logs.map((log) => ({
                    id: log.id.toString(),
                    method: (log.level === "warning" ? "warn" : log.level) as
                      | "log"
                      | "warn"
                      | "error"
                      | "info"
                      | "debug",
                    data: [
                      `[${formatLocaleDateTime(log.timestamp)}]`,
                      log.message,
                      ...(log.data && Object.keys(log.data as object).length > 0 ? [log.data] : []),
                    ],
                  }))}
                  variant="light"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
