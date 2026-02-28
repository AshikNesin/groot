import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { formatLocaleDateTime } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import type { Job, JobLog } from "@/types";
import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { Console } from "console-feed";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Play,
  RefreshCw,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export function JobDetail() {
  const { queueName, jobId } = useParams<{
    queueName: string;
    jobId: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [lastLogId, setLastLogId] = useState<number>(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadJob depends on url params
  useEffect(() => {
    setLogs([]);
    setLastLogId(0);

    loadJob();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [queueName, jobId]);

  const fetchLogs = async () => {
    if (!queueName || !jobId) return;
    try {
      setLastLogId((currentLastId) => {
        apiClient
          .getJobLogs(queueName, jobId, currentLastId)
          .then((newLogs) => {
            if (newLogs.length > 0) {
              setLogs((prevLogs) => [...prevLogs, ...newLogs]);
              const maxId = Math.max(...newLogs.map((l) => l.id));
              setLastLogId(Math.max(currentLastId, maxId));
            }
          })
          .catch((err) => {
            console.error("Failed to fetch logs", err);
          });
        return currentLastId;
      });
    } catch (err) {
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
        description:
          error instanceof Error ? error.message : "Failed to retry job",
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
        description:
          error instanceof Error ? error.message : "Failed to cancel job",
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
        description:
          error instanceof Error ? error.message : "Failed to resume job",
      });
    }
  };

  const handleDelete = async () => {
    if (!job) return;

    if (
      !window.confirm(
        "Are you sure you want to delete this job? This action cannot be undone.",
      )
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
        description:
          error instanceof Error ? error.message : "Failed to delete job",
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
        description:
          error instanceof Error ? error.message : "Failed to re-run job",
      });
    }
  };

  const getStateBadge = (state: string) => {
    const stateConfig: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        icon: React.ReactNode;
      }
    > = {
      active: {
        variant: "default",
        icon: <Activity className="w-3 h-3 mr-1" />,
      },
      created: {
        variant: "secondary",
        icon: <Clock className="w-3 h-3 mr-1" />,
      },
      retry: {
        variant: "outline",
        icon: <RefreshCw className="w-3 h-3 mr-1" />,
      },
      failed: {
        variant: "destructive",
        icon: <XCircle className="w-3 h-3 mr-1" />,
      },
      completed: {
        variant: "outline",
        icon: <CheckCircle className="w-3 h-3 mr-1 text-green-600" />,
      },
      expired: {
        variant: "secondary",
        icon: <AlertCircle className="w-3 h-3 mr-1" />,
      },
      cancelled: { variant: "secondary", icon: <X className="w-3 h-3 mr-1" /> },
    };

    const config = stateConfig[state] || {
      variant: "default" as const,
      icon: null,
    };

    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {state}
      </Badge>
    );
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return formatLocaleDateTime(new Date(date));
  };

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return "N/A";
    const duration = new Date(end).getTime() - new Date(start).getTime();
    return `${(duration / 1000).toFixed(2)}s`;
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
          <Button
            variant="ghost"
            onClick={() => navigate("/jobs")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
          <div className="text-center py-20">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Job Not Found
            </h2>
            <p className="text-sm text-gray-500">
              {error || "The job you are looking for does not exist."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/jobs")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-medium text-gray-900">
                Job Details
              </h1>
              <p className="text-sm font-mono text-gray-500 mt-1">{job.id}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {job.state === "failed" && (
                <Button variant="outline" onClick={handleRetry} size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}
              {(job.state === "completed" || job.state === "failed") && (
                <Button variant="outline" onClick={handleRerun} size="sm">
                  <Play className="w-4 h-4 mr-2" />
                  Re-run
                </Button>
              )}
              {job.state === "cancelled" && (
                <Button variant="outline" onClick={handleResume} size="sm">
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              )}
              {(job.state === "active" ||
                job.state === "created" ||
                job.state === "retry") && (
                <Button variant="outline" onClick={handleCancel} size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button variant="destructive" onClick={handleDelete} size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Job Overview */}
          <div>
            <h2 className="text-sm font-medium text-gray-900 mb-4">
              Job Overview
            </h2>
            <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
              <div>
                <dt className="text-sm text-gray-500">Job Name</dt>
                <dd className="text-sm font-mono text-gray-900 mt-1">
                  {job.name}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">State</dt>
                <dd className="mt-1">{getStateBadge(job.state)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Priority</dt>
                <dd className="text-sm text-gray-900 mt-1">{job.priority}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Retries</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {job.retrycount} / {job.retrylimit}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {formatDate(job.createdon)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Started</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {formatDate(job.startedon)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Completed</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {formatDate(job.completedon)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Duration</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {formatDuration(job.startedon, job.completedon)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Retry Delay</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {job.retrydelay}s
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Retry Backoff</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {job.retrybackoff ? "Yes" : "No"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Expire In</dt>
                <dd className="text-sm text-gray-900 mt-1">{job.expirein}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Keep Until</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {formatDate(job.keepuntil)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Job Data */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Job Data</h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <CodeMirror
                value={JSON.stringify(job.data, null, 2)}
                extensions={[json(), EditorView.lineWrapping]}
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
            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-sm font-medium text-gray-900 mb-4">
                Job Output
              </h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <CodeMirror
                  value={JSON.stringify(job.output, null, 2)}
                  extensions={[json(), EditorView.lineWrapping]}
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
            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-sm font-medium text-red-600 mb-4">
                Error Details
              </h2>
              <pre className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs overflow-x-auto text-red-900">
                {job.deadletter}
              </pre>
            </div>
          )}

          {/* Singleton Info */}
          {(job.singletonkey || job.singletonon) && (
            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-sm font-medium text-gray-900 mb-4">
                Singleton Configuration
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                {job.singletonkey && (
                  <div>
                    <dt className="text-sm text-gray-500">Singleton Key</dt>
                    <dd className="text-sm font-mono text-gray-900 mt-1">
                      {job.singletonkey}
                    </dd>
                  </div>
                )}
                {job.singletonon && (
                  <div>
                    <dt className="text-sm text-gray-500">Singleton On</dt>
                    <dd className="text-sm text-gray-900 mt-1">
                      {formatDate(job.singletonon)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Real-time Logs */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-sm font-medium text-gray-900 mb-4">
              Real-time Logs
            </h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="p-4 text-gray-500 italic text-sm">
                  No logs available
                </div>
              ) : (
                <Console
                  logs={logs.map((log) => ({
                    id: log.id.toString(),
                    // biome-ignore lint/suspicious/noExplicitAny: console-feed types are strict
                    method: (log.level === "warning"
                      ? "warn"
                      : log.level) as any,
                    data: [
                      `[${formatLocaleDateTime(new Date(log.timestamp))}]`,
                      log.message,
                      ...(log.data && Object.keys(log.data as object).length > 0
                        ? [log.data]
                        : []),
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
