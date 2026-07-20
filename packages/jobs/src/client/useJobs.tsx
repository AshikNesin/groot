import { jobsApi } from "./api";
import { formatJobId } from "./utils";
import { endOfDay, startOfDay, startOfMonth, subtractDays } from "@groot/shell/lib/utils";
import type { Job, JobName, ScheduledJob } from "./types";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { secondaryOptions } from "./constants";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

const PAGE_SIZE = 50;
// Operational view: always refetch on revisit/focus rather than serving the
// 5-minute-cached list (overrides the global QueryClient staleTime).
const JOBS_STALE_TIME = 0;

const STATS_KEY = ["jobs", "stats"] as const;
const AVAILABLE_KEY = ["jobs", "available"] as const;
const SCHEDULED_KEY = ["jobs", "scheduled"] as const;
const LIST_KEY = ["jobs", "list"] as const;

/**
 * All state, data-loading, and mutations for the Jobs page. Server data
 * (stats / jobs list / available / scheduled) is held in React Query; dialog,
 * selection, and draft state stay local. Mutations call the API, toast, then
 * invalidate the relevant queries so the cache refetches.
 */
export function useJobs() {
  const queryClient = useQueryClient();
  const [queryParams, setQueryParams] = useQueryStates({
    state: parseAsString.withDefault("all"),
    queue: parseAsString.withDefault("all"),
    search: parseAsString.withDefault(""),
    page: parseAsInteger.withDefault(0),
    startDate: parseAsString,
    endDate: parseAsString,
    datePreset: parseAsString.withDefault("all"),
  });

  // Dialog / draft / selection state (UI only)
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
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
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleJobTypeSearch, setScheduleJobTypeSearch] = useState("");
  const [addJobTypeSearch, setAddJobTypeSearch] = useState("");
  const [queueSearch, setQueueSearch] = useState("");

  // --- Queries ---
  const statsQuery = useQuery({
    queryKey: STATS_KEY,
    queryFn: jobsApi.getJobStats,
    staleTime: JOBS_STALE_TIME,
  });
  const availableQuery = useQuery({
    queryKey: AVAILABLE_KEY,
    queryFn: jobsApi.getAvailableJobs,
    staleTime: JOBS_STALE_TIME,
  });
  const scheduledQuery = useQuery({
    queryKey: SCHEDULED_KEY,
    queryFn: jobsApi.getScheduledJobs,
    staleTime: JOBS_STALE_TIME,
  });

  const jobsQuery = useQuery({
    queryKey: [
      ...LIST_KEY,
      queryParams.state,
      queryParams.queue,
      queryParams.page,
      queryParams.startDate ?? null,
      queryParams.endDate ?? null,
    ],
    queryFn: () => {
      const filters: {
        state?: string;
        name?: string;
        limit: number;
        offset: number;
        startDate?: string;
        endDate?: string;
      } = { limit: PAGE_SIZE, offset: queryParams.page * PAGE_SIZE };
      if (queryParams.state !== "all") filters.state = queryParams.state;
      if (queryParams.queue !== "all") filters.name = queryParams.queue;
      if (queryParams.startDate) filters.startDate = queryParams.startDate;
      if (queryParams.endDate) filters.endDate = queryParams.endDate;
      return jobsApi.getJobs(filters);
    },
    placeholderData: keepPreviousData,
    staleTime: JOBS_STALE_TIME,
  });

  // Derived view (search is a client-side filter on the fetched page)
  const fetchedJobs = jobsQuery.data?.jobs ?? [];
  const jobs: Job[] = queryParams.search.trim()
    ? fetchedJobs.filter((job) => {
        const q = queryParams.search.toLowerCase().trim();
        return job.id.toLowerCase().includes(q) || job.name.toLowerCase().includes(q);
      })
    : fetchedJobs;
  const total = queryParams.search.trim() ? jobs.length : (jobsQuery.data?.total ?? 0);

  const invalidateJobs = () => {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
    queryClient.invalidateQueries({ queryKey: STATS_KEY });
  };
  const invalidateScheduled = () => queryClient.invalidateQueries({ queryKey: SCHEDULED_KEY });

  // Clear selection whenever the filter / page changes
  useEffect(() => {
    setSelectedJobs(new Set());
  }, [
    queryParams.state,
    queryParams.queue,
    queryParams.page,
    queryParams.startDate,
    queryParams.endDate,
    queryParams.search,
  ]);

  const handlePresetChange = (value: string) => {
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
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: LIST_KEY }),
      queryClient.refetchQueries({ queryKey: STATS_KEY }),
      queryClient.refetchQueries({ queryKey: SCHEDULED_KEY }),
    ]);
    setRefreshing(false);
  };

  const handleRetry = async (queueName: string, jobId: string) => {
    try {
      await jobsApi.retryJob(queueName, jobId);
      toast.success("Success", { description: "Job has been queued for retry" });
      invalidateJobs();
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
      invalidateJobs();
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
      invalidateJobs();
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
      invalidateJobs();
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
              View new job ({formatJobId(result.newJobId)})
            </Link>
          </span>
        ),
      });
      invalidateJobs();
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
      invalidateJobs();
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
      invalidateJobs();
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
              View job ({formatJobId(jobId)})
            </Link>
          </span>
        ),
      });
      setAddJobDialogOpen(false);
      setNewJobName("");
      setNewJobData("{}");
      invalidateJobs();
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
      invalidateScheduled();
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
      invalidateScheduled();
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
      invalidateScheduled();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to update scheduled job",
      });
    }
  };

  const activeSecondaryTab = secondaryOptions.find((t) => t.value === queryParams.state);

  return {
    pageSize: PAGE_SIZE,
    stats: statsQuery.data ?? null,
    statsLoading: statsQuery.isLoading,
    queryParams,
    setQueryParams,
    jobs,
    selectedJobs,
    scheduledJobs: scheduledQuery.data ?? [],
    scheduledLoading: scheduledQuery.isLoading,
    loading: jobsQuery.isLoading,
    error: jobsQuery.error
      ? jobsQuery.error instanceof Error
        ? jobsQuery.error.message
        : "Failed to load jobs"
      : null,
    refreshing,
    total,
    availableJobs: availableQuery.data ?? [],
    lastRefreshed: jobsQuery.dataUpdatedAt ? new Date(jobsQuery.dataUpdatedAt) : null,
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
