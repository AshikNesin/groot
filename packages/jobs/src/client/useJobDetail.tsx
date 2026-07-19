import { jobsApi } from "./api";
import { formatJobId } from "./utils";
import type { JobLog } from "./types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

  const retry = async () => {
    if (!job) return;
    try {
      await jobsApi.retryJob(job.name, job.id);
      toast.success("Success", { description: "Job has been queued for retry" });
      invalidateJob();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to retry job",
      });
    }
  };

  const cancel = async () => {
    if (!job) return;
    try {
      await jobsApi.cancelJob(job.name, job.id);
      toast.success("Success", { description: "Job has been cancelled" });
      invalidateJob();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to cancel job",
      });
    }
  };

  const resume = async () => {
    if (!job) return;
    try {
      await jobsApi.resumeJob(job.name, job.id);
      toast.success("Success", { description: "Job has been resumed" });
      invalidateJob();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to resume job",
      });
    }
  };

  const deleteJob = async () => {
    if (!job) return;
    if (
      !window.confirm("Are you sure you want to delete this job? This action cannot be undone.")
    ) {
      return;
    }
    try {
      await jobsApi.deleteJob(job.name, job.id);
      toast.success("Success", { description: "Job has been deleted" });
      navigate("/jobs");
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to delete job",
      });
    }
  };

  const rerun = async () => {
    if (!job) return;
    try {
      const result = await jobsApi.rerunJob(job.name, job.id);
      toast.success("Success", {
        description: (
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
      });
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to re-run job",
      });
    }
  };

  return { job, loading, error, logs, retry, cancel, resume, deleteJob, rerun };
}
