export const JOB_STATES = {
  CREATED: "created",
  RETRY: "retry",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  FAILED: "failed",
} as const;

export const VALID_JOB_STATES = Object.values(JOB_STATES);

export const RESERVED_QUEUE_NAMES = [
  "schedule",
  "stats",
  "available",
  "state",
] as const;

export function isValidJobState(state: string): boolean {
  return VALID_JOB_STATES.includes(state as (typeof VALID_JOB_STATES)[number]);
}

export function isReservedQueueName(name: string): boolean {
  return RESERVED_QUEUE_NAMES.includes(name as (typeof RESERVED_QUEUE_NAMES)[number]);
}

export function getJobStateDescription(state: string): string {
  const descriptions: Record<string, string> = {
    [JOB_STATES.CREATED]: "Job created and waiting to be processed",
    [JOB_STATES.RETRY]: "Job failed and waiting for retry",
    [JOB_STATES.ACTIVE]: "Job is currently being processed",
    [JOB_STATES.COMPLETED]: "Job completed successfully",
    [JOB_STATES.CANCELLED]: "Job was cancelled before completion",
    [JOB_STATES.FAILED]: "Job failed and exhausted retries",
  };

  return descriptions[state] ?? "Unknown job state";
}
