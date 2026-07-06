import { apiClient } from "@/core/lib/api";
import type { Job, JobLog } from "@/core/types/jobs";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

/**
 * Owns the job-detail page's data + actions: loads the job, polls its logs,
 * and exposes the retry / re-run / resume / cancel / delete mutations.
 * Lifted out of the component so the page is mostly layout.
 */
export function useJobDetail() {
  const { queueName, jobId } = useParams<{ queueName: string; jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const lastLogIdRef = useRef<number>(0);
  const activeJobRef = useRef<string>("");

  const fetchLogs = useCallback(async () => {
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
  }, [queueName, jobId]);

  const loadJob = useCallback(async () => {
    if (!queueName || !jobId) return;

    try {
      setLoading(true);
      setError(null);
      const jobData = await apiClient.getJob(queueName, jobId);
      setJob(jobData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job");
      toast.error("Error", {
        description: err instanceof Error ? err.message : "Failed to load job",
      });
    } finally {
      setLoading(false);
    }
  }, [queueName, jobId]);

  useEffect(() => {
    const jobKey = `${queueName}/${jobId}`;
    activeJobRef.current = jobKey;
    setLogs([]);
    lastLogIdRef.current = 0;

    loadJob();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [queueName, jobId, loadJob, fetchLogs]);

  const retry = async () => {
    if (!job) return;

    try {
      await apiClient.retryJob(job.name, job.id);
      toast.success("Success", { description: "Job has been queued for retry" });
      loadJob();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to retry job",
      });
    }
  };

  const cancel = async () => {
    if (!job) return;

    try {
      await apiClient.cancelJob(job.name, job.id);
      toast.success("Success", { description: "Job has been cancelled" });
      loadJob();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to cancel job",
      });
    }
  };

  const resume = async () => {
    if (!job) return;

    try {
      await apiClient.resumeJob(job.name, job.id);
      toast.success("Success", { description: "Job has been resumed" });
      loadJob();
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
      await apiClient.deleteJob(job.name, job.id);
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
      const result = await apiClient.rerunJob(job.name, job.id);
      toast.success("Success", {
        description: (
          <span>
            Job re-run created.{" "}
            <Link
              to={`/jobs/${result.queueName}/${result.newJobId}`}
              className="underline font-medium hover:text-foreground"
            >
              View new job ({result.newJobId.substring(0, 8)}...)
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
