import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Skeleton } from "@/ui/loading-skeleton";
import { StatusBadge } from "@/ui";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { Checkbox } from "@/ui/checkbox";
import { Textarea } from "@/ui/textarea";
import { useToast } from "@/core/hooks/use-toast";
import {
  endOfDay,
  formatDuration,
  formatLocaleDateTime,
  formatRelativeTime,
  startOfDay,
  startOfMonth,
  subtractDays,
} from "@/core/lib/utils";
import { apiClient } from "@/core/lib/api";
import type { Job, JobName, JobStats, ScheduledJob } from "@/core/types/jobs";
import { json } from "@codemirror/lang-json";
import CodeMirror from "@uiw/react-codemirror";
import {
  Activity,
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  MoreHorizontal,
  MoreVertical,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
  Pencil,
} from "lucide-react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

type StateTab = "all" | "active" | "created" | "retry" | "failed" | "completed" | "cancelled";

const STATE_TABS: { value: StateTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "created", label: "Created" },
  { value: "retry", label: "Retry" },
  { value: "failed", label: "Failed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIMARY_TABS: StateTab[] = ["all", "active", "failed", "completed"];

const primaryOptions = STATE_TABS.filter((t) => PRIMARY_TABS.includes(t.value));
const secondaryOptions = STATE_TABS.filter((t) => !PRIMARY_TABS.includes(t.value));

function StatCard({
  label,
  value,
  colorClass,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  value: number;
  colorClass: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left border border-dashed p-4 flex flex-col gap-1 transition-colors hover:bg-accent/50 ${
        isActive ? "bg-accent/50 border-solid" : "bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className={`text-2xl font-semibold tabular-nums ${colorClass}`}>
        {value.toLocaleString()}
      </span>
    </button>
  );
}

export function Jobs() {
  const { toast } = useToast();
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
  const [editScheduledKey, setEditScheduledKey] = useState<string | undefined>(undefined);
  const [editScheduledCron, setEditScheduledCron] = useState("");
  const [editScheduledDataStr, setEditScheduledDataStr] = useState("{}");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [scheduleJobTypeSearch, setScheduleJobTypeSearch] = useState("");
  const [addJobTypeSearch, setAddJobTypeSearch] = useState("");

  const pageSize = 50;

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

      const statsData = await apiClient.getJobStats();
      setStats(statsData);

      const filters: {
        state?: string;
        name?: string;
        limit: number;
        offset: number;
        startDate?: string;
        endDate?: string;
      } = {
        limit: pageSize,
        offset: queryParams.page * pageSize,
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

      const { jobs: jobsData, total: totalCount } = await apiClient.getJobs(filters);

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
      toast({
        variant: "destructive",
        title: "Error",
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
    toast,
  ]);

  const loadAvailableJobs = useCallback(async () => {
    try {
      const jobs = await apiClient.getAvailableJobs();
      setAvailableJobs(jobs);
    } catch (error) {
      console.error("Failed to load available jobs:", error);
    }
  }, []);

  const loadScheduledJobs = useCallback(async () => {
    try {
      const scheduled = await apiClient.getScheduledJobs();
      setScheduledJobs(scheduled);
    } catch (error) {
      console.error("Failed to load scheduled jobs:", error);
    }
  }, []);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    loadAvailableJobs();
    loadScheduledJobs();

    if (!queryParams.startDate && !queryParams.endDate && queryParams.datePreset === "all") {
      handlePresetChange("all");
    }
  }, []);

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
      await apiClient.retryJob(queueName, jobId);
      toast({ title: "Success", description: "Job has been queued for retry" });
      loadData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to retry job",
      });
    }
  };

  const handleCancel = async (queueName: string, jobId: string) => {
    try {
      await apiClient.cancelJob(queueName, jobId);
      toast({ title: "Success", description: "Job has been cancelled" });
      loadData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel job",
      });
    }
  };

  const handleResume = async (queueName: string, jobId: string) => {
    try {
      await apiClient.resumeJob(queueName, jobId);
      toast({ title: "Success", description: "Job has been resumed" });
      loadData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resume job",
      });
    }
  };

  const handleDelete = async (queueName: string, jobId: string) => {
    try {
      await apiClient.deleteJob(queueName, jobId);
      toast({ title: "Success", description: "Job has been deleted" });
      loadData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete job",
      });
    }
  };

  const handleRerun = async (queueName: string, jobId: string) => {
    try {
      const result = await apiClient.rerunJob(queueName, jobId);
      toast({
        title: "Success",
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
      toast({
        variant: "destructive",
        title: "Error",
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

      const results = await apiClient.rerunJobs(jobsToRerun);
      const successCount = results.filter((r) => r.success).length;

      toast({
        title: "Bulk Action Completed",
        description: `Successfully triggered re-run for ${successCount} of ${results.length} jobs.`,
      });

      setSelectedJobs(new Set());
      loadData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
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
      const { deletedCount } = await apiClient.purgeJobsByState(state);
      toast({
        title: "Success",
        description: `Purged ${deletedCount} ${state} jobs`,
      });
      loadData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to purge jobs",
      });
    }
  };

  const handleAddJob = async () => {
    if (!newJobName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a job name",
      });
      return;
    }

    try {
      const data = JSON.parse(newJobData);
      const jobId = await apiClient.addJob(newJobName as JobName, data);
      toast({
        title: "Success",
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
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add job",
      });
    }
  };

  const jsonExtension = useMemo(() => json(), []);

  const handleScheduleJob = async () => {
    if (!scheduledJobName || !scheduledJobCron) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a job name and provide a cron expression",
      });
      return;
    }

    try {
      const data = JSON.parse(scheduledJobData);
      await apiClient.scheduleJob(scheduledJobName as JobName, scheduledJobCron, data);
      toast({ title: "Success", description: "Job has been scheduled" });
      setScheduleJobDialogOpen(false);
      setScheduledJobName("");
      setScheduledJobCron("");
      setScheduledJobData("{}");
      loadScheduledJobs();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule job",
      });
    }
  };

  const handleCancelScheduledJob = async (jobName: string, key?: string) => {
    if (!window.confirm(`Are you sure you want to cancel the scheduled job "${jobName}"?`)) {
      return;
    }

    try {
      await apiClient.cancelScheduledJob(jobName, key);
      toast({
        title: "Success",
        description: "Scheduled job has been cancelled",
      });
      loadScheduledJobs();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel scheduled job",
      });
    }
  };

  const openEditScheduledDialog = (job: ScheduledJob) => {
    setEditScheduledName(job.name);
    setEditScheduledKey(job.key);
    setEditScheduledCron(job.cron);
    setEditScheduledDataStr(JSON.stringify(job.data ?? {}, null, 2));
    setEditScheduledDialogOpen(true);
  };

  const handleEditScheduledJob = async () => {
    if (!editScheduledCron) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a cron expression",
      });
      return;
    }

    try {
      const data = JSON.parse(editScheduledDataStr);
      await apiClient.editScheduledJob(
        editScheduledName,
        editScheduledKey,
        editScheduledCron,
        data,
      );
      toast({ title: "Success", description: "Scheduled job has been updated" });
      setEditScheduledDialogOpen(false);
      loadScheduledJobs();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update scheduled job",
      });
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return formatLocaleDateTime(date);
  };

  const formatJobDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return "N/A";
    return formatDuration(start, end);
  };

  const activeSecondaryTab = secondaryOptions.find((t) => t.value === queryParams.state);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Jobs</h1>
            {lastRefreshed && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Updated {formatRelativeTime(lastRefreshed)}
                {refreshing && <RefreshCw className="w-3 h-3 inline ml-1 animate-spin" />}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh</span>
            </Button>
            <Dialog open={scheduleJobDialogOpen} onOpenChange={setScheduleJobDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <CalendarIcon className="w-3.5 h-3.5 md:mr-1.5" />
                  <span className="hidden md:inline">Schedule</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Schedule Recurring Job</DialogTitle>
                  <DialogDescription>
                    Schedule a job to run on a recurring cron schedule
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="scheduled-job-name">Job Type</Label>
                    <DropdownMenu
                      onOpenChange={(open) => {
                        if (!open) setScheduleJobTypeSearch("");
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          id="scheduled-job-name"
                          className="w-full justify-between h-10 px-3 text-sm font-normal"
                        >
                          <span className={scheduledJobName ? "" : "text-muted-foreground"}>
                            {scheduledJobName || "Select job type"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-[var(--radix-dropdown-menu-trigger-width)]"
                      >
                        <div className="px-2 pt-1">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <Input
                              placeholder="Search job types..."
                              value={scheduleJobTypeSearch}
                              onChange={(e) => setScheduleJobTypeSearch(e.target.value)}
                              className="pl-7 h-7 text-xs border-0 bg-transparent focus-visible:ring-0"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <DropdownMenuSeparator />
                        <div className="max-h-[180px] overflow-y-auto">
                          {availableJobs
                            .filter((job) =>
                              job.toLowerCase().includes(scheduleJobTypeSearch.toLowerCase()),
                            )
                            .map((job) => (
                              <DropdownMenuItem
                                key={job}
                                onSelect={() => setScheduledJobName(job as JobName)}
                                className="text-xs"
                              >
                                {job}
                              </DropdownMenuItem>
                            ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div>
                    <Label htmlFor="scheduled-job-cron">Cron Expression</Label>
                    <Input
                      id="scheduled-job-cron"
                      value={scheduledJobCron}
                      onChange={(e) => setScheduledJobCron(e.target.value)}
                      placeholder="*/5 * * * *"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Example: "*/5 * * * *" runs every 5 minutes
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="scheduled-job-data">Job Data (JSON)</Label>
                    <Textarea
                      id="scheduled-job-data"
                      value={scheduledJobData}
                      onChange={(e) => setScheduledJobData(e.target.value)}
                      placeholder='{"key": "value"}'
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setScheduleJobDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleScheduleJob}>Schedule Job</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={addJobDialogOpen} onOpenChange={setAddJobDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs">
                  <Plus className="w-3.5 h-3.5 md:mr-1.5" />
                  <span className="hidden md:inline">Add Job</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Job</DialogTitle>
                  <DialogDescription>Manually trigger a background job</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="job-name">Job Type</Label>
                    <DropdownMenu
                      onOpenChange={(open) => {
                        if (!open) setAddJobTypeSearch("");
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          id="job-name"
                          className="w-full justify-between h-10 px-3 text-sm font-normal"
                        >
                          <span className={newJobName ? "" : "text-muted-foreground"}>
                            {newJobName || "Select job type"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-[var(--radix-dropdown-menu-trigger-width)]"
                      >
                        <div className="px-2 pt-1">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <Input
                              placeholder="Search job types..."
                              value={addJobTypeSearch}
                              onChange={(e) => setAddJobTypeSearch(e.target.value)}
                              className="pl-7 h-7 text-xs border-0 bg-transparent focus-visible:ring-0"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <DropdownMenuSeparator />
                        <div className="max-h-[180px] overflow-y-auto">
                          {availableJobs
                            .filter((job) =>
                              job.toLowerCase().includes(addJobTypeSearch.toLowerCase()),
                            )
                            .map((job) => (
                              <DropdownMenuItem
                                key={job}
                                onSelect={() => setNewJobName(job as JobName)}
                                className="text-xs"
                              >
                                {job}
                              </DropdownMenuItem>
                            ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div>
                    <Label htmlFor="job-data">Job Data (JSON)</Label>
                    <div className="mt-1 overflow-hidden rounded-md border">
                      <CodeMirror
                        value={newJobData}
                        height="200px"
                        extensions={[jsonExtension]}
                        onChange={(value) => setNewJobData(value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddJobDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddJob}>Add Job</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {/* Edit Scheduled Job Dialog */}
            <Dialog open={editScheduledDialogOpen} onOpenChange={setEditScheduledDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Scheduled Job</DialogTitle>
                  <DialogDescription>
                    Update cron schedule or data for "{editScheduledName}"
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-scheduled-cron">Cron Expression</Label>
                    <Input
                      id="edit-scheduled-cron"
                      value={editScheduledCron}
                      onChange={(e) => setEditScheduledCron(e.target.value)}
                      placeholder="*/5 * * * *"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Example: "*/5 * * * *" runs every 5 minutes
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="edit-scheduled-data">Job Data (JSON)</Label>
                    <Textarea
                      id="edit-scheduled-data"
                      value={editScheduledDataStr}
                      onChange={(e) => setEditScheduledDataStr(e.target.value)}
                      placeholder='{"key": "value"}'
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditScheduledDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleEditScheduledJob}>Save Changes</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            <StatCard
              label="Total"
              value={stats.active + stats.created + stats.retry + stats.failed + stats.completed}
              colorClass="text-foreground"
              icon={<Activity className="w-3.5 h-3.5" />}
              isActive={queryParams.state === "all"}
              onClick={() => setQueryParams({ state: "all", page: 0 })}
            />
            <StatCard
              label="Active"
              value={stats.active}
              colorClass="text-info"
              icon={<Activity className="w-3.5 h-3.5" />}
              isActive={queryParams.state === "active"}
              onClick={() => setQueryParams({ state: "active", page: 0 })}
            />
            <StatCard
              label="Created"
              value={stats.created}
              colorClass="text-muted-foreground"
              icon={<Clock className="w-3.5 h-3.5" />}
              isActive={queryParams.state === "created"}
              onClick={() => setQueryParams({ state: "created", page: 0 })}
            />
            <StatCard
              label="Retry"
              value={stats.retry}
              colorClass="text-warning"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              isActive={queryParams.state === "retry"}
              onClick={() => setQueryParams({ state: "retry", page: 0 })}
            />
            <StatCard
              label="Failed"
              value={stats.failed}
              colorClass="text-destructive"
              icon={<XCircle className="w-3.5 h-3.5" />}
              isActive={queryParams.state === "failed"}
              onClick={() => setQueryParams({ state: "failed", page: 0 })}
            />
            <StatCard
              label="Completed"
              value={stats.completed}
              colorClass="text-success"
              icon={<CheckCircle className="w-3.5 h-3.5" />}
              isActive={queryParams.state === "completed"}
              onClick={() => setQueryParams({ state: "completed", page: 0 })}
            />
            <StatCard
              label="Cancelled"
              value={stats.cancelled}
              colorClass="text-muted-foreground"
              icon={<X className="w-3.5 h-3.5" />}
              isActive={queryParams.state === "cancelled"}
              onClick={() => setQueryParams({ state: "cancelled", page: 0 })}
            />
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Tabs
              value={queryParams.state}
              onValueChange={(value) => setQueryParams({ state: value, page: 0 })}
            >
              <TabsList>
                {primaryOptions.map((option) => (
                  <TabsTrigger key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </TabsTrigger>
                ))}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`inline-flex h-full items-center justify-center whitespace-nowrap rounded-sm px-2 py-1 text-xs font-medium transition-all focus-visible:outline-none ${
                        activeSecondaryTab
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      {activeSecondaryTab ? (
                        <span className="max-w-[5rem] truncate">{activeSecondaryTab.label}</span>
                      ) : (
                        <MoreHorizontal className="w-4 h-4" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {secondaryOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onSelect={() => setQueryParams({ state: option.value, page: 0 })}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 shrink-0">
              <div className="relative w-40 lg:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={queryParams.search}
                  onChange={(e) => setQueryParams({ search: e.target.value, page: 0 })}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              {availableJobs.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <Filter className="w-3.5 h-3.5 md:mr-1.5" />
                      <span className="hidden md:inline max-w-[6rem] truncate">
                        {queryParams.queue !== "all" ? queryParams.queue : "Queue"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onSelect={() => setQueryParams({ queue: "all", page: 0 })}
                      className="text-xs"
                    >
                      All Queues
                    </DropdownMenuItem>
                    <div className="max-h-[200px] overflow-y-auto">
                      {availableJobs.map((jobName) => (
                        <DropdownMenuItem
                          key={jobName}
                          onSelect={() => setQueryParams({ queue: jobName, page: 0 })}
                          className="text-xs"
                        >
                          {jobName}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <CalendarIcon className="w-3.5 h-3.5 md:mr-1.5" />
                    <span className="hidden md:inline">
                      {queryParams.datePreset !== "all"
                        ? queryParams.datePreset.replace(/-/g, " ")
                        : "Date"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handlePresetChange("today")}>
                    Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handlePresetChange("last-7-days")}>
                    Last 7 Days
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handlePresetChange("this-month")}>
                    This Month
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handlePresetChange("all")}>
                    All Time
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {queryParams.queue !== "all" && (
                <Badge variant="secondary" className="h-6 text-[11px] gap-1 whitespace-nowrap">
                  {queryParams.queue}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setQueryParams({ queue: "all", page: 0 })}
                  />
                </Badge>
              )}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {queryParams.state === "all" ? "All jobs" : `${queryParams.state} jobs`}
              </span>
              <span className="text-xs text-muted-foreground">
                Showing {jobs.length} of {total}
              </span>
            </div>
            <div className="flex gap-2">
              {selectedJobs.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkRerun}
                  className="h-7 text-xs"
                >
                  <Play className="w-3 h-3 md:mr-1.5" />
                  Rerun {selectedJobs.size}
                </Button>
              )}
              {queryParams.state !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePurge(queryParams.state)}
                  className="h-7 text-xs text-destructive"
                >
                  <Trash2 className="w-3 h-3 md:mr-1.5" />
                  Purge {queryParams.state}
                </Button>
              )}
            </div>
          </div>

          {loading && jobs.length === 0 ? (
            <div className="divide-y divide-border/50">
              <div className="grid grid-cols-12 gap-4 border-b border-dashed py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="col-span-5">Job</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Created</div>
                <div className="col-span-2">Started</div>
                <div className="col-span-1" />
              </div>
              {[...Array(12)].map((_, i) => (
                <div key={i.toString()} className="grid grid-cols-12 items-center gap-4 py-3">
                  <div className="col-span-5 flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-4 rounded" />
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
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-muted p-3 mb-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-sm text-foreground">No jobs found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {queryParams.state !== "all"
                  ? `No ${queryParams.state} jobs`
                  : "The queue is empty"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop: CSS Grid Table */}
              <div className="hidden md:block">
                <div className="grid grid-cols-12 gap-4 border-b border-dashed py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <div className="col-span-5 flex items-center gap-3">
                    <Checkbox
                      checked={jobs.length > 0 && selectedJobs.size === jobs.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                      className="h-3.5 w-3.5"
                    />
                    <span>Job</span>
                  </div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Created</div>
                  <div className="col-span-2">Started</div>
                  <div className="col-span-1" />
                </div>
                <div className="divide-y divide-border/50">
                  {jobs.map((job) => (
                    <Link
                      key={job.id}
                      to={`/jobs/${job.name}/${job.id}`}
                      className="group grid grid-cols-12 items-center gap-4 py-3 text-sm hover:bg-accent/30 transition-colors"
                    >
                      <div className="col-span-5 flex items-center gap-3 min-w-0">
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleJobSelection(job.name, job.id);
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedJobs.has(
                              JSON.stringify({ queueName: job.name, jobId: job.id }),
                            )}
                            className="h-3.5 w-3.5"
                          />
                        </div>
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{job.name}</div>
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            {job.id.substring(0, 12)}...
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <StatusBadge status={job.state} />
                      </div>
                      <div
                        className="col-span-2 text-muted-foreground"
                        title={formatDate(job.createdon)}
                      >
                        {job.createdon ? formatRelativeTime(job.createdon) : "N/A"}
                      </div>
                      <div
                        className="col-span-2 text-muted-foreground"
                        title={formatDate(job.startedon)}
                      >
                        {job.startedon ? formatRelativeTime(job.startedon) : "—"}
                      </div>
                      <div className="col-span-1 flex items-center justify-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.preventDefault()}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            {job.state === "failed" && (
                              <DropdownMenuItem onClick={() => handleRetry(job.name, job.id)}>
                                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                                Retry
                              </DropdownMenuItem>
                            )}
                            {(job.state === "completed" || job.state === "failed") && (
                              <DropdownMenuItem onClick={() => handleRerun(job.name, job.id)}>
                                <Play className="w-3.5 h-3.5 mr-2" />
                                Re-run
                              </DropdownMenuItem>
                            )}
                            {job.state === "cancelled" && (
                              <DropdownMenuItem onClick={() => handleResume(job.name, job.id)}>
                                <Play className="w-3.5 h-3.5 mr-2" />
                                Resume
                              </DropdownMenuItem>
                            )}
                            {(job.state === "active" ||
                              job.state === "created" ||
                              job.state === "retry") && (
                              <DropdownMenuItem onClick={() => handleCancel(job.name, job.id)}>
                                <X className="w-3.5 h-3.5 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDelete(job.name, job.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Mobile: Card View */}
              <div className="md:hidden space-y-2">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.name}/${job.id}`}
                    className="block border border-border rounded-lg p-3 space-y-2 active:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{job.name}</div>
                          <div className="font-mono text-[11px] text-muted-foreground mt-0.5 truncate">
                            {job.id.substring(0, 16)}...
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={job.state} />
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">Created</span>
                        <div className="font-medium mt-0.5">
                          {job.createdon ? formatRelativeTime(job.createdon) : "N/A"}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Started</span>
                        <div className="font-medium mt-0.5">
                          {job.startedon ? formatRelativeTime(job.startedon) : "—"}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Retries</span>
                        <div className="font-medium mt-0.5">
                          {job.retrycount}/{job.retrylimit}
                        </div>
                      </div>
                      {job.startedon && (
                        <div>
                          <span className="text-muted-foreground">Duration</span>
                          <div className="font-medium mt-0.5">
                            {formatJobDuration(job.startedon, job.completedon)}
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {total > pageSize && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-xs text-muted-foreground">
                    Page {queryParams.page + 1} of {Math.ceil(total / pageSize)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQueryParams({
                          page: Math.max(0, queryParams.page - 1),
                        })
                      }
                      disabled={queryParams.page === 0}
                      className="h-7 text-xs"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQueryParams({ page: queryParams.page + 1 })}
                      disabled={(queryParams.page + 1) * pageSize >= total}
                      className="h-7 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Scheduled Jobs */}
        {scheduledJobs.length > 0 && (
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Scheduled jobs
              </span>
              <span className="text-xs text-muted-foreground">{scheduledJobs.length} total</span>
            </div>
            <div className="hidden md:block">
              <div className="grid grid-cols-12 gap-4 border-b border-dashed py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="col-span-3">Job name</div>
                <div className="col-span-3">Schedule</div>
                <div className="col-span-2">Timezone</div>
                <div className="col-span-3">Data</div>
                <div className="col-span-1" />
              </div>
              <div className="divide-y divide-border/50">
                {scheduledJobs.map((job) => (
                  <div
                    key={`${job.name}-${job.key}`}
                    className="grid grid-cols-12 items-center gap-4 py-3 text-sm group"
                  >
                    <div className="col-span-3 font-medium">{job.name}</div>
                    <div className="col-span-3 font-mono text-xs text-muted-foreground">
                      {job.cron}
                    </div>
                    <div className="col-span-2 text-muted-foreground">{job.timezone || "UTC"}</div>
                    <div className="col-span-3">
                      <pre className="font-mono text-[11px] bg-muted p-1.5 rounded truncate max-w-xs">
                        {JSON.stringify(job.data)}
                      </pre>
                    </div>
                    <div className="col-span-1 flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditScheduledDialog(job)}
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit schedule"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelScheduledJob(job.name, job.key)}
                        className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Cancel schedule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Mobile scheduled cards */}
            <div className="md:hidden space-y-2">
              {scheduledJobs.map((job) => (
                <div
                  key={`${job.name}-${job.key}`}
                  className="border border-border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{job.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelScheduledJob(job.name, job.key)}
                      className="h-7 w-7 p-0 text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-muted-foreground">Schedule: </span>
                      <span className="font-mono">{job.cron}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data: </span>
                      <span className="font-mono text-[11px]">{JSON.stringify(job.data)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
