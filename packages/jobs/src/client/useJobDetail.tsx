import { jobsApi } from "./api";
import { formatJobId, withJobToast } from "./utils";
import type { JobLog } from "./types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useConfirm } from "@groot/ui/primitives";

/**
 * Owns the job-detail page's data + actions. The job is fetched via React
 * Query; logs are polled + accumulated on local state (a streaming pattern the
 * query cache doesn't model). Mutations call the API, toast, then invalidate
 * the job query.
 */
export function useJobDetail() {
  const { queueName, jobId } = useParams<{ queueName: string; jobId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const jobQuery = useQuery({
    queryKey: ["job", queueName, jobId],
    queryFn: () => {
      if (!queueName || !jobId) throw new Error("Missing job reference");
      return jobsApi.getJob(queueName, jobId);
    },
    enabled: Boolean(queueName && jobId),
  });

  const job = jobQuery.data ?? null;
  const loading = jobQuery.isLoading;
  const error = jobQuery.error
    ? jobQuery.error instanceof Error
      ? jobQuery.error.message
      : "Failed to load job"
    : null;

  const invalidateJob = () =>
    queryClient.invalidateQueries({ queryKey: ["job", queueName, jobId] });

  // Logs are a streaming/accumulation concern — polled and appended — so they
  // stay on local state rather than the React Query cache.
  const [logs, setLogs] = useState<JobLog[]>([]);
  const lastLogIdRef = useRef(0);
  const activeJobRef = useRef("");

  const fetchLogs = useCallback(async () => {
    if (!queueName || !jobId) return;
    const jobKey = `${queueName}/${jobId}`;
    try {
      const currentLastId = lastLogIdRef.current;
      const newLogs = await jobsApi.getJobLogs(queueName, jobId, currentLastId);
      if (activeJobRef.current !== jobKey) return;
      if (newLogs.length > 0) {
        setLogs((prevLogs) => [...prevLogs, ...newLogs]);
        lastLogIdRef.current = Math.max(currentLastId, ...newLogs.map((l) => l.id));
      }
    } catch (err) {
      if (activeJobRef.current !== jobKey) return;
      console.error("Failed to fetch logs", err);
    }
  }, [queueName, jobId]);

  useEffect(() => {
    const jobKey = `${queueName}/${jobId}`;
    activeJobRef.current = jobKey;
    setLogs([]);
    lastLogIdRef.current = 0;
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [queueName, jobId, fetchLogs]);

  const retry = () => {
    if (!job) return;
    return withJobToast(
      () => jobsApi.retryJob(job.name, job.id),
      () => "Job has been queued for retry",
      "Failed to retry job",
      invalidateJob,
    );
  };

  const cancel = () => {
    if (!job) return;
    return withJobToast(
      () => jobsApi.cancelJob(job.name, job.id),
      () => "Job has been cancelled",
      "Failed to cancel job",
      invalidateJob,
    );
  };

  const resume = () => {
    if (!job) return;
    return withJobToast(
      () => jobsApi.resumeJob(job.name, job.id),
      () => "Job has been resumed",
      "Failed to resume job",
      invalidateJob,
    );
  };

  const deleteJob = async () => {
    if (!job) return;
    if (
      !(await confirm({
        title: "Delete this job?",
        description: "This action cannot be undone.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) {
      return;
    }
    return withJobToast(
      () => jobsApi.deleteJob(job.name, job.id),
      () => "Job has been deleted",
      "Failed to delete job",
      () => navigate("/jobs"),
    );
  };

  const rerun = () => {
    if (!job) return;
    return withJobToast(
      () => jobsApi.rerunJob(job.name, job.id),
      (result) => (
        <span>
          Job re-run created.{" "}
          <Link
            to={`/jobs/${result.queueName}/${result.newJobId}`}
            className="underline font-medium hover:text-foreground"
          >
            View new job ({formatJobId(result.newJobId)})
          </Link>
        </span>
      ),
      "Failed to re-run job",
    );
  };

  return { job, loading, error, logs, retry, cancel, resume, deleteJob, rerun };
}
