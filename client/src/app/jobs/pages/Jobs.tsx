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
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { StatusBadge } from "@/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Checkbox } from "@/ui/checkbox";
import { Textarea } from "@/ui/textarea";
import { useToast } from "@/core/hooks/use-toast";
import {
  endOfDay,
  formatDuration,
  formatLocaleDateTime,
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
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle as ClearIcon,
  Clock,
  Filter,
  Loader,
  MoreVertical,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

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
    datePreset: parseAsString.withDefault("today"),
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only run once on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    loadAvailableJobs();
    loadScheduledJobs();

    if (!queryParams.startDate && !queryParams.endDate) {
      if (queryParams.datePreset === "today") {
        handlePresetChange("today");
      }
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
    toast({
      title: "Refreshed",
      description: "Job list has been refreshed",
    });
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
              className="underline font-medium hover:text-gray-900"
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
    (queryParams.datePreset !== "all" && queryParams.datePreset !== "today");

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
              className="underline font-medium hover:text-gray-900"
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

  const handleCancelScheduledJob = async (jobName: string) => {
    if (!window.confirm(`Are you sure you want to cancel the scheduled job "${jobName}"?`)) {
      return;
    }

    try {
      await apiClient.cancelScheduledJob(jobName);
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

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return formatLocaleDateTime(date);
  };

  const formatJobDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return "N/A";
    return formatDuration(start, end);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-medium text-gray-900">Job Queue Management</h1>
            <p className="text-sm text-gray-500 mt-1">Monitor and manage background jobs</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={scheduleJobDialogOpen} onOpenChange={setScheduleJobDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-none">
                  <CalendarIcon className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Schedule Job</span>
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
                    <Select
                      value={scheduledJobName}
                      onValueChange={(value) => setScheduledJobName(value as JobName)}
                    >
                      <SelectTrigger id="scheduled-job-name">
                        <SelectValue placeholder="Select job type" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableJobs.map((job) => (
                          <SelectItem key={job} value={job}>
                            {job}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <Button className="flex-1 sm:flex-none">
                  <Plus className="w-4 h-4 md:mr-2" />
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
                    <Select
                      value={newJobName}
                      onValueChange={(value) => setNewJobName(value as JobName)}
                    >
                      <SelectTrigger id="job-name">
                        <SelectValue placeholder="Select job type" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableJobs.map((job) => (
                          <SelectItem key={job} value={job}>
                            {job}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="job-data">Job Data (JSON)</Label>
                    <div className="mt-1 overflow-hidden rounded-md border">
                      <CodeMirror
                        value={newJobData}
                        height="200px"
                        extensions={[json()]}
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
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className={`w-4 h-4 md:mr-2 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <button
              type="button"
              onClick={() => setQueryParams({ state: "all", page: 0 })}
              className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-sm text-gray-500 mb-1">Total</div>
              <div className="text-2xl font-medium text-gray-900">
                {stats.active + stats.created + stats.retry + stats.failed + stats.completed}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setQueryParams({ state: "active", page: 0 })}
              className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-sm text-gray-500 mb-1">Active</div>
              <div className="text-2xl font-medium text-blue-600">{stats.active}</div>
            </button>
            <button
              type="button"
              onClick={() => setQueryParams({ state: "created", page: 0 })}
              className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-sm text-gray-500 mb-1">Created</div>
              <div className="text-2xl font-medium text-gray-900">{stats.created}</div>
            </button>
            <button
              type="button"
              onClick={() => setQueryParams({ state: "retry", page: 0 })}
              className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-sm text-gray-500 mb-1">Retry</div>
              <div className="text-2xl font-medium text-yellow-600">{stats.retry}</div>
            </button>
            <button
              type="button"
              onClick={() => setQueryParams({ state: "failed", page: 0 })}
              className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-sm text-gray-500 mb-1">Failed</div>
              <div className="text-2xl font-medium text-red-600">{stats.failed}</div>
            </button>
            <button
              type="button"
              onClick={() => setQueryParams({ state: "completed", page: 0 })}
              className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-sm text-gray-500 mb-1">Completed</div>
              <div className="text-2xl font-medium text-green-600">{stats.completed}</div>
            </button>
            <button
              type="button"
              onClick={() => setQueryParams({ state: "cancelled", page: 0 })}
              className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-sm text-gray-500 mb-1">Cancelled</div>
              <div className="text-2xl font-medium text-gray-900">{stats.cancelled}</div>
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </h2>
          <div className="flex flex-col md:flex-row gap-3">
            {/* Date Filter */}
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium mb-2 block">Date Range</Label>
              <Select value={queryParams.datePreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* State Filter */}
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block">Job State</Label>
              <Select
                value={queryParams.state}
                onValueChange={(value) => setQueryParams({ state: value, page: 0 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3 h-3 text-blue-500" />
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="created">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Created
                    </div>
                  </SelectItem>
                  <SelectItem value="retry">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 text-yellow-500" />
                      Retry
                    </div>
                  </SelectItem>
                  <SelectItem value="failed">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-3 h-3 text-red-500" />
                      Failed
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Completed
                    </div>
                  </SelectItem>
                  <SelectItem value="cancelled">
                    <div className="flex items-center gap-2">
                      <X className="w-3 h-3" />
                      Cancelled
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Queue Name Filter */}
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block">Queue Name</Label>
              <Select
                value={queryParams.queue}
                onValueChange={(value) => setQueryParams({ queue: value, page: 0 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Queues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Queues</SelectItem>
                  {availableJobs.map((jobName) => (
                    <SelectItem key={jobName} value={jobName}>
                      {jobName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Filter */}
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Job ID or Name..."
                  value={queryParams.search}
                  onChange={(e) => setQueryParams({ search: e.target.value, page: 0 })}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleClearFilters}
                  className="w-full sm:w-auto whitespace-nowrap"
                >
                  <ClearIcon className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {queryParams.datePreset !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Date:{" "}
                  {queryParams.datePreset
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-destructive"
                    onClick={() => handlePresetChange("all")}
                  />
                </Badge>
              )}
              {queryParams.state !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  State: {queryParams.state}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-destructive"
                    onClick={() => setQueryParams({ state: "all", page: 0 })}
                  />
                </Badge>
              )}
              {queryParams.queue !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Queue: {queryParams.queue}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-destructive"
                    onClick={() => setQueryParams({ queue: "all", page: 0 })}
                  />
                </Badge>
              )}
              {queryParams.search.trim() && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{queryParams.search}"
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-destructive"
                    onClick={() => setQueryParams({ search: "", page: 0 })}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Jobs Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium text-gray-900">
                {queryParams.state === "all"
                  ? "All Jobs"
                  : `${queryParams.state.charAt(0).toUpperCase() + queryParams.state.slice(1)} Jobs`}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Showing {jobs.length} of {total} jobs
              </p>
            </div>
            <div className="flex gap-2">
              {selectedJobs.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkRerun}
                  className="whitespace-nowrap"
                >
                  <Play className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Rerun Selected ({selectedJobs.size})</span>
                  <span className="md:hidden">Rerun ({selectedJobs.size})</span>
                </Button>
              )}
              {queryParams.state !== "all" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handlePurge(queryParams.state)}
                  className="whitespace-nowrap"
                >
                  <Trash2 className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Purge All {queryParams.state} Jobs</span>
                  <span className="md:hidden">Purge</span>
                </Button>
              )}
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="w-8 h-8 animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No jobs found</div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.name}/${job.id}`}
                    className="block border border-gray-200 rounded-lg p-4 space-y-3 active:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{job.name}</div>
                        <div className="font-mono text-xs text-muted-foreground mt-0.5">
                          {job.id.substring(0, 16)}...
                        </div>
                      </div>
                      <StatusBadge status={job.state} showIcon />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Created</span>
                        <div className="font-medium mt-0.5">{formatDate(job.createdon)}</div>
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

              {/* Desktop Table View */}
              <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={jobs.length > 0 && selectedJobs.size === jobs.length}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead className="font-medium text-gray-700">ID</TableHead>
                      <TableHead className="font-medium text-gray-700">Job Name</TableHead>
                      <TableHead className="font-medium text-gray-700">State</TableHead>
                      <TableHead className="font-medium text-gray-700">Created</TableHead>
                      <TableHead className="font-medium text-gray-700">Started</TableHead>
                      <TableHead className="font-medium text-gray-700">Completed</TableHead>
                      <TableHead className="font-medium text-gray-700">Duration</TableHead>
                      <TableHead className="font-medium text-gray-700">Retries</TableHead>
                      <TableHead className="font-medium text-gray-700 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow
                        key={job.id}
                        className="cursor-pointer hover:bg-gray-50 transition-colors border-gray-200"
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedJobs.has(
                              JSON.stringify({
                                queueName: job.name,
                                jobId: job.id,
                              }),
                            )}
                            onCheckedChange={() => toggleJobSelection(job.name, job.id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select job ${job.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <Link to={`/jobs/${job.name}/${job.id}`} className="hover:underline">
                            {job.id.substring(0, 8)}...
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link to={`/jobs/${job.name}/${job.id}`} className="hover:underline">
                            {job.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link to={`/jobs/${job.name}/${job.id}`}>
                            <StatusBadge status={job.state} showIcon />
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(job.createdon)}</TableCell>
                        <TableCell className="text-sm">{formatDate(job.startedon)}</TableCell>
                        <TableCell className="text-sm">{formatDate(job.completedon)}</TableCell>
                        <TableCell className="text-sm">
                          {formatJobDuration(job.startedon, job.completedon)}
                        </TableCell>
                        <TableCell>
                          {job.retrycount}/{job.retrylimit}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {job.state === "failed" && (
                                <DropdownMenuItem onClick={() => handleRetry(job.name, job.id)}>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Retry
                                </DropdownMenuItem>
                              )}
                              {(job.state === "completed" || job.state === "failed") && (
                                <DropdownMenuItem onClick={() => handleRerun(job.name, job.id)}>
                                  <Play className="w-4 h-4 mr-2" />
                                  Re-run
                                </DropdownMenuItem>
                              )}
                              {job.state === "cancelled" && (
                                <DropdownMenuItem onClick={() => handleResume(job.name, job.id)}>
                                  <Play className="w-4 h-4 mr-2" />
                                  Resume
                                </DropdownMenuItem>
                              )}
                              {(job.state === "active" ||
                                job.state === "created" ||
                                job.state === "retry") && (
                                <DropdownMenuItem onClick={() => handleCancel(job.name, job.id)}>
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(job.name, job.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {total > pageSize && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
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
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQueryParams({ page: queryParams.page + 1 })}
                      disabled={(queryParams.page + 1) * pageSize >= total}
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
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="text-sm font-medium text-gray-900">Scheduled Jobs</h2>
            <p className="text-sm text-gray-500 mt-1">
              Recurring jobs running on cron schedules ({scheduledJobs.length} total)
            </p>
          </div>
          {scheduledJobs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No scheduled jobs found</div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-medium text-gray-700">Job Name</TableHead>
                    <TableHead className="font-medium text-gray-700">Cron Schedule</TableHead>
                    <TableHead className="font-medium text-gray-700">Timezone</TableHead>
                    <TableHead className="font-medium text-gray-700">Data</TableHead>
                    <TableHead className="font-medium text-gray-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledJobs.map((job) => (
                    <TableRow key={job.name}>
                      <TableCell className="font-medium">{job.name}</TableCell>
                      <TableCell className="font-mono text-sm">{job.cron}</TableCell>
                      <TableCell>{job.timezone || "UTC"}</TableCell>
                      <TableCell>
                        <pre className="font-mono text-xs bg-muted p-2 rounded max-w-xs overflow-x-auto">
                          {JSON.stringify(job.data, null, 2)}
                        </pre>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelScheduledJob(job.name)}
                          className="text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
