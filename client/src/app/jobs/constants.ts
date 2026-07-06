/**
 * Shared job-page constants + types. Kept out of the component files so those
 * files only export components (react-doctor/only-export-components).
 */

import type { JobName } from "@/core/types/jobs";

export type StateTab =
  | "all"
  | "active"
  | "created"
  | "retry"
  | "failed"
  | "completed"
  | "cancelled";

export const STATE_TABS: { value: StateTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "created", label: "Created" },
  { value: "retry", label: "Retry" },
  { value: "failed", label: "Failed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIMARY_TABS: StateTab[] = ["all", "active", "failed", "completed"];

export const primaryOptions = STATE_TABS.filter((t) => PRIMARY_TABS.includes(t.value));
export const secondaryOptions = STATE_TABS.filter((t) => !PRIMARY_TABS.includes(t.value));

/** Shared fields for dialogs that pick a job type via the searchable dropdown. */
export type JobTypeDialogFields = {
  name: JobName | "";
  onNameChange: (value: JobName) => void;
  typeSearch: string;
  onTypeSearchChange: (value: string) => void;
  availableJobs: string[];
};

/** Patch shape for the URL-synced query params (matches the nuqs setter). */
export type JobsQueryPatch = Partial<{
  state: string;
  queue: string;
  search: string;
  page: number;
  startDate: string | null;
  endDate: string | null;
  datePreset: string;
}>;
