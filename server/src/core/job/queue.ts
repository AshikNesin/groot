export enum JobName {
  TODO_CLEANUP = "todo-cleanup",
  TODO_SUMMARY = "todo-summary",
}

export type TodoCleanupJobData = {
  daysToKeep?: number;
  parentTraceId?: string;
};

export type TodoSummaryJobData = {
  includeCompleted?: boolean;
  parentTraceId?: string;
};

export type JobDataMap = {
  [JobName.TODO_CLEANUP]: TodoCleanupJobData;
  [JobName.TODO_SUMMARY]: TodoSummaryJobData;
};

export type AnyJobData = JobDataMap[JobName];
