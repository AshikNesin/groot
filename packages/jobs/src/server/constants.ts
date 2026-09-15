export const JOB_STATES = {
  CREATED: "created",
  RETRY: "retry",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  FAILED: "failed",
  EXPIRED: "expired",
} as const;

export const VALID_JOB_STATES = Object.values(JOB_STATES);

export const RESERVED_QUEUE_NAMES = ["schedule", "stats", "available", "state"] as const;

export function isValidJobState(state: string): boolean {
  return VALID_JOB_STATES.includes(state as (typeof VALID_JOB_STATES)[number]);
}

export function isReservedQueueName(name: string): boolean {
  return RESERVED_QUEUE_NAMES.includes(name as (typeof RESERVED_QUEUE_NAMES)[number]);
}
