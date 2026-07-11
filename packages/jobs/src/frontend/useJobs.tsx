import { jobsApi } from "./api";
import { endOfDay, startOfDay, startOfMonth, subtractDays } from "@groot/client/lib/utils";
import type { Job, JobName, JobStats, ScheduledJob } from "./types";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { secondaryOptions } from "./constants";

const PAGE_SIZE = 50;

/**
 * All state, data-loading, and mutations for the Jobs page. Owns the query
 * params (URL-synced), the jobs/scheduled-jobs/stats fetches, selection, and
 * the retry / re-run / cancel / delete / purge / schedule flows. Lifted out
 * so the page is layout + composition.
 */
export function useJobs() {
  const [stats, setStats] = useState<JobStats | null>(null);
  const [queryParams, setQueryParams] = useQueryStates({
    state: parseAsString.withDefault("all"),
    queue: parseAsString.withDefault("all"),
    search: parseAsString.withDefault(""),
    page: parseAsInteger.withDefault(0),
    startDate: parseAsString,
    endDate: parseAsString,
    datePreset: parseAsString.withDefault("all"),
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [availableJobs, setAvailableJobs] = useState<string[]>([]);
  const [addJobDialogOpen, setAddJobDialogOpen] = useState(false);
  const [scheduleJobDialogOpen, setScheduleJobDialogOpen] = useState(false);
  const [newJobName, setNewJobName] = useState<JobName | "">("");
  const [newJobData, setNewJobData] = useState("{}");
  const [scheduledJobName, setScheduledJobName] = useState<JobName | "">("");
  const [scheduledJobCron, setScheduledJobCron] = useState("");
  const [scheduledJobData, setScheduledJobData] = useState("{}");
  const [editScheduledDialogOpen, setEditScheduledDialogOpen] = useState(false);
  const [editScheduledName, setEditScheduledName] = useState("");
  const editScheduledKeyRef = useRef<string | undefined>(undefined);
  const [editScheduledCron, setEditScheduledCron] = useState("");
  const [editScheduledDataStr, setEditScheduledDataStr] = useState("{}");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [scheduleJobTypeSearch, setScheduleJobTypeSearch] = useState("");
  const [addJobTypeSearch, setAddJobTypeSearch] = useState("");
  const [queueSearch, setQueueSearch] = useState("");

  const handlePresetChange = useCallback(
    (value: string) => {
      const now = new Date();
      let start: Date | undefined;
      let end: Date | undefined = endOfDay(now);

      switch (value) {
        case "today":
          start = startOfDay(now);
          break;
        case "last-7-days":
          start = startOfDay(subtractDays(now, 6));
          break;
        case "this-month":
          start = startOfMonth(now);
          break;
        default:
          start = undefined;
          end = undefined;
      }

      setQueryParams({
        datePreset: value,
        startDate: start ? start.toISOString() : null,
        endDate: end ? end.toISOString() : null,
        page: 0,
      });
    },
    [setQueryParams],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const statsData = await jobsApi.getJobStats();
      setStats(statsData);

      const filters: {
        state?: string;
        name?: string;
        limit: number;
        offset: number;
        startDate?: string;
        endDate?: string;
      } = {
        limit: PAGE_SIZE,
        offset: queryParams.page * PAGE_SIZE,
      };

      if (queryParams.state !== "all") {
        filters.state = queryParams.state;
      }

      if (queryParams.queue !== "all") {
        filters.name = queryParams.queue;
      }

      if (queryParams.startDate) {
        filters.startDate = queryParams.startDate;
      }
      if (queryParams.endDate) {
        filters.endDate = queryParams.endDate;
      }

      const { jobs: jobsData, total: totalCount } = await jobsApi.getJobs(filters);

      let filteredJobs = jobsData;
      if (queryParams.search.trim()) {
        const query = queryParams.search.toLowerCase().trim();
        filteredJobs = jobsData.filter(
          (job) => job.id.toLowerCase().includes(query) || job.name.toLowerCase().includes(query),
        );
      }

      setJobs(filteredJobs);
      setTotal(queryParams.search.trim() ? filteredJobs.length : totalCount);
      setLastRefreshed(new Date());
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to load jobs",
      });
    } finally {
      setLoading(false);
    }
  }, [
    queryParams.state,
    queryParams.queue,
    queryParams.search,
    queryParams.page,
    queryParams.startDate,
    queryParams.endDate,
  ]);

  const loadAvailableJobs = useCallback(async () => {
    try {
      const jobs = await jobsApi.getAvailableJobs();
      setAvailableJobs(jobs);
    } catch (error) {
      console.error("Failed to load available jobs:", error);
    }
  }, []);

  const loadScheduledJobs = useCallback(async () => {
    try {
      const scheduled = await jobsApi.getScheduledJobs();
      setScheduledJobs(scheduled);
    } catch (error) {
      console.error("Failed to load scheduled jobs:", error);
    }
  }, []);

  const hasInitialized = useRef(false);

  // Mount-once bootstrap. `hasInitialized` keeps it to a single run even though
  // exhaustive-deps lists the (stable) callbacks + queryParams.
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    loadAvailableJobs();
    loadScheduledJobs();

    if (!queryParams.startDate && !queryParams.endDate && queryParams.datePreset === "all") {
      handlePresetChange("all");
    }
  }, [loadAvailableJobs, loadScheduledJobs, handlePresetChange, queryParams]);

  useEffect(() => {
    loadData();
    setSelectedJobs(new Set());
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadScheduledJobs()]);
    setRefreshing(false);
  };

  const handleRetry = async (queueName: string, jobId: string) => {
    try {
      await jobsApi.retryJob(queueName, jobId);
      toast.success("Success", { description: "Job has been queued for retry" });
      loadData();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to retry job",
      });
    }
  };

  const handleCancel = async (queueName: string, jobId: string) => {
    try {
      await jobsApi.cancelJob(queueName, jobId);
      toast.success("Success", { description: "Job has been cancelled" });
      loadData();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to cancel job",
      });
    }
  };

  const handleResume = async (queueName: string, jobId: string) => {
    try {
      await jobsApi.resumeJob(queueName, jobId);
      toast.success("Success", { description: "Job has been resumed" });
      loadData();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to resume job",
      });
    }
  };

  const handleDelete = async (queueName: string, jobId: string) => {
    try {
      await jobsApi.deleteJob(queueName, jobId);
      toast.success("Success", { description: "Job has been deleted" });
      loadData();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to delete job",
      });
    }
  };

  const handleRerun = async (queueName: string, jobId: string) => {
    try {
      const result = await jobsApi.rerunJob(queueName, jobId);
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
      loadData();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to re-run job",
      });
    }
  };

  const handleBulkRerun = async () => {
    if (selectedJobs.size === 0) return;

    if (!window.confirm(`Are you sure you want to re-run ${selectedJobs.size} selected jobs?`)) {
      return;
    }

    try {
      const jobsToRerun = Array.from(selectedJobs).map((key) => JSON.parse(key)) as {
        queueName: string;
        jobId: string;
      }[];

      const results = await jobsApi.rerunJobs(jobsToRerun);
      const successCount = results.filter((r) => r.success).length;

      toast.success("Bulk Action Completed", {
        description: `Successfully triggered re-run for ${successCount} of ${results.length} jobs.`,
      });

      setSelectedJobs(new Set());
      loadData();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to re-run jobs",
      });
    }
  };

  const toggleJobSelection = (queueName: string, jobId: string) => {
    const key = JSON.stringify({ queueName, jobId });
    const newSelection = new Set(selectedJobs);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    setSelectedJobs(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
    } else {
      const newSelection = new Set<string>();
      for (const job of jobs) {
        newSelection.add(JSON.stringify({ queueName: job.name, jobId: job.id }));
      }
      setSelectedJobs(newSelection);
    }
  };

  const handleClearFilters = () => {
    setQueryParams({
      state: "all",
      queue: "all",
      search: "",
      page: 0,
      startDate: null,
      endDate: null,
      datePreset: "all",
    });
  };

  const hasActiveFilters =
    queryParams.state !== "all" ||
    queryParams.queue !== "all" ||
    queryParams.search.trim() !== "" ||
    queryParams.datePreset !== "all";

  const handlePurge = async (state: string) => {
    if (
      !window.confirm(
        `Are you sure you want to purge all ${state} jobs? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const { deletedCount } = await jobsApi.purgeJobsByState(state);
      toast.success("Success", {
        description: `Purged ${deletedCount} ${state} jobs`,
      });
      loadData();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to purge jobs",
      });
    }
  };

  const handleAddJob = async () => {
    if (!newJobName) {
      toast.error("Error", { description: "Please select a job name" });
      return;
    }

    try {
      const data = JSON.parse(newJobData);
      const jobId = await jobsApi.addJob(newJobName as JobName, data);
      toast.success("Success", {
        description: (
          <span>
            Job has been added to the queue.{" "}
            <Link
              to={`/jobs/${newJobName}/${jobId}`}
              className="underline font-medium hover:text-foreground"
            >
              View job ({jobId.substring(0, 8)}...)
            </Link>
          </span>
        ),
      });
      setAddJobDialogOpen(false);
      setNewJobName("");
      setNewJobData("{}");
      loadData();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to add job",
      });
    }
  };

  const handleScheduleJob = async () => {
    if (!scheduledJobName || !scheduledJobCron) {
      toast.error("Error", {
        description: "Please select a job name and provide a cron expression",
      });
      return;
    }

    try {
      const data = JSON.parse(scheduledJobData);
      await jobsApi.scheduleJob(scheduledJobName as JobName, scheduledJobCron, data);
      toast.success("Success", { description: "Job has been scheduled" });
      setScheduleJobDialogOpen(false);
      setScheduledJobName("");
      setScheduledJobCron("");
      setScheduledJobData("{}");
      loadScheduledJobs();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to schedule job",
      });
    }
  };

  const handleCancelScheduledJob = async (jobName: string, key?: string) => {
    if (!window.confirm(`Are you sure you want to cancel the scheduled job "${jobName}"?`)) {
      return;
    }

    try {
      await jobsApi.cancelScheduledJob(jobName, key);
      toast.success("Success", { description: "Scheduled job has been cancelled" });
      loadScheduledJobs();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to cancel scheduled job",
      });
    }
  };

  const openEditScheduledDialog = (job: ScheduledJob) => {
    setEditScheduledName(job.name);
    editScheduledKeyRef.current = job.key;
    setEditScheduledCron(job.cron);
    setEditScheduledDataStr(JSON.stringify(job.data ?? {}, null, 2));
    setEditScheduledDialogOpen(true);
  };

  const handleEditScheduledJob = async () => {
    if (!editScheduledCron) {
      toast.error("Error", { description: "Please provide a cron expression" });
      return;
    }

    try {
      const data = JSON.parse(editScheduledDataStr);
      await jobsApi.editScheduledJob(
        editScheduledName,
        editScheduledKeyRef.current,
        editScheduledCron,
        data,
      );
      toast.success("Success", { description: "Scheduled job has been updated" });
      setEditScheduledDialogOpen(false);
      loadScheduledJobs();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to update scheduled job",
      });
    }
  };

  const activeSecondaryTab = secondaryOptions.find((t) => t.value === queryParams.state);

  return {
    pageSize: PAGE_SIZE,
    stats,
    queryParams,
    setQueryParams,
    jobs,
    selectedJobs,
    scheduledJobs,
    loading,
    refreshing,
    total,
    availableJobs,
    lastRefreshed,
    activeSecondaryTab,
    hasActiveFilters,
    queueSearch,
    setQueueSearch,
    handlePresetChange,
    handleClearFilters,
    handleRefresh,
    handlePurge,
    handleRetry,
    handleRerun,
    handleResume,
    handleCancel,
    handleDelete,
    handleBulkRerun,
    toggleJobSelection,
    toggleSelectAll,
    openEditScheduledDialog,
    handleCancelScheduledJob,
    // Add-job dialog
    addJobDialogOpen,
    setAddJobDialogOpen,
    newJobName,
    setNewJobName,
    newJobData,
    setNewJobData,
    addJobTypeSearch,
    setAddJobTypeSearch,
    handleAddJob,
    // Schedule-job dialog
    scheduleJobDialogOpen,
    setScheduleJobDialogOpen,
    scheduledJobName,
    setScheduledJobName,
    scheduledJobCron,
    setScheduledJobCron,
    scheduledJobData,
    setScheduledJobData,
    scheduleJobTypeSearch,
    setScheduleJobTypeSearch,
    handleScheduleJob,
    // Edit-scheduled dialog
    editScheduledDialogOpen,
    setEditScheduledDialogOpen,
    editScheduledName,
    editScheduledCron,
    setEditScheduledCron,
    editScheduledDataStr,
    setEditScheduledDataStr,
    handleEditScheduledJob,
  };
}
