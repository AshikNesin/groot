import { Button } from "@groot/ui/button";
import { formatRelativeTime } from "@groot/client/lib/utils";
import { AddJobDialog } from "../components/AddJobDialog";
import { EditScheduledJobDialog } from "../components/EditScheduledJobDialog";
import { ScheduleJobDialog } from "../components/ScheduleJobDialog";
import { JobsFilters } from "../components/JobsFilters";
import { JobsStats } from "../components/JobsStats";
import { JobsTable } from "../components/JobsTable";
import { ScheduledJobsPanel } from "../components/ScheduledJobsPanel";
import { useJobs } from "../hooks/useJobs";
import { RefreshCw } from "lucide-react";

export function Jobs() {
  const j = useJobs();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Jobs</h1>
            {j.lastRefreshed && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Updated {formatRelativeTime(j.lastRefreshed)}
                {j.refreshing && <RefreshCw className="w-3 h-3 inline ml-1 animate-spin" />}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={j.handleRefresh}
              disabled={j.refreshing}
              className="h-8"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${j.refreshing ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh</span>
            </Button>
            <ScheduleJobDialog
              open={j.scheduleJobDialogOpen}
              onOpenChange={j.setScheduleJobDialogOpen}
              name={j.scheduledJobName}
              onNameChange={j.setScheduledJobName}
              cron={j.scheduledJobCron}
              onCronChange={j.setScheduledJobCron}
              data={j.scheduledJobData}
              onDataChange={j.setScheduledJobData}
              typeSearch={j.scheduleJobTypeSearch}
              onTypeSearchChange={j.setScheduleJobTypeSearch}
              availableJobs={j.availableJobs}
              onSubmit={j.handleScheduleJob}
            />
            <AddJobDialog
              open={j.addJobDialogOpen}
              onOpenChange={j.setAddJobDialogOpen}
              name={j.newJobName}
              onNameChange={j.setNewJobName}
              data={j.newJobData}
              onDataChange={j.setNewJobData}
              typeSearch={j.addJobTypeSearch}
              onTypeSearchChange={j.setAddJobTypeSearch}
              availableJobs={j.availableJobs}
              onSubmit={j.handleAddJob}
            />
            <EditScheduledJobDialog
              open={j.editScheduledDialogOpen}
              onOpenChange={j.setEditScheduledDialogOpen}
              name={j.editScheduledName}
              cron={j.editScheduledCron}
              onCronChange={j.setEditScheduledCron}
              data={j.editScheduledDataStr}
              onDataChange={j.setEditScheduledDataStr}
              onSubmit={j.handleEditScheduledJob}
            />
          </div>
        </div>

        {/* Stats */}
        {j.stats && (
          <JobsStats
            stats={j.stats}
            activeState={j.queryParams.state}
            onSelectState={(state) => j.setQueryParams({ state, page: 0 })}
          />
        )}

        {/* Filters */}
        <JobsFilters
          queryParams={j.queryParams}
          setQueryParams={j.setQueryParams}
          activeSecondaryTab={j.activeSecondaryTab}
          hasActiveFilters={j.hasActiveFilters}
          availableJobs={j.availableJobs}
          queueSearch={j.queueSearch}
          setQueueSearch={j.setQueueSearch}
          handlePresetChange={j.handlePresetChange}
          handleClearFilters={j.handleClearFilters}
        />
      </div>

      {/* Jobs Table */}
      <JobsTable
        jobs={j.jobs}
        loading={j.loading}
        total={j.total}
        queryParams={j.queryParams}
        setQueryParams={j.setQueryParams}
        selectedJobs={j.selectedJobs}
        toggleJobSelection={j.toggleJobSelection}
        toggleSelectAll={j.toggleSelectAll}
        handleBulkRerun={j.handleBulkRerun}
        handlePurge={j.handlePurge}
        onRetry={j.handleRetry}
        onRerun={j.handleRerun}
        onResume={j.handleResume}
        onCancel={j.handleCancel}
        onDelete={j.handleDelete}
      />

      {/* Scheduled Jobs */}
      <ScheduledJobsPanel
        scheduledJobs={j.scheduledJobs}
        onEdit={j.openEditScheduledDialog}
        onCancel={j.handleCancelScheduledJob}
      />
    </div>
  );
}
