import { Button } from "@groot/ui/button";
import { PageLayout } from "@groot/shell/components/layout/PageLayout";
import { formatRelativeTime } from "@groot/shell/lib/utils";
import { AddJobDialog } from "./components/AddJobDialog";
import { EditScheduledJobDialog } from "./components/EditScheduledJobDialog";
import { ScheduleJobDialog } from "./components/ScheduleJobDialog";
import { JobsFilters } from "./components/JobsFilters";
import { JobsStats } from "./components/JobsStats";
import { JobsTable } from "./components/JobsTable";
import { ScheduledJobsPanel } from "./components/ScheduledJobsPanel";
import { useJobs } from "./useJobs";
import { RefreshCw } from "lucide-react";

export function Jobs() {
  const j = useJobs();

  const actions = (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={j.handleRefresh}
        disabled={j.refreshing}
        title="Refresh"
      >
        <RefreshCw className={`size-4 ${j.refreshing ? "animate-spin" : ""}`} />
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
    </>
  );

  const description = j.lastRefreshed
    ? `Updated ${formatRelativeTime(j.lastRefreshed)}${j.refreshing ? " · refreshing…" : ""}`
    : undefined;

  return (
    <PageLayout title="Jobs" description={description} actions={actions} maxWidth="7xl">
      {j.stats && (
        <JobsStats
          stats={j.stats}
          activeState={j.queryParams.state}
          onSelectState={(state) => j.setQueryParams({ state, page: 0 })}
        />
      )}

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

      <JobsTable
        jobs={j.jobs}
        loading={j.loading}
        total={j.total}
        error={j.error}
        onErrorRetry={j.handleRefresh}
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

      <ScheduledJobsPanel
        scheduledJobs={j.scheduledJobs}
        onEdit={j.openEditScheduledDialog}
        onCancel={j.handleCancelScheduledJob}
      />
    </PageLayout>
  );
}
