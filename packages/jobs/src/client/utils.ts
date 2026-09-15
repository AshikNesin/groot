import { toast } from "sonner";
import type { ReactNode } from "react";

/**
 * Shorten a job ID for display. UUIDs (pg-boss / Postgres) are truncated to
 * the first 6 chars; short numeric IDs (honker / SQLite) are shown in full.
 */
export function formatJobId(id: string): string {
  return id.length > 8 ? id.substring(0, 6) : id;
}

/**
 * Run a job action with the standard toast pattern: success toast (with the
 * given description) and error toast (API error message or fallback) shared
 * by every dashboard mutation.
 */
export async function withJobToast<T>(
  action: () => Promise<T>,
  successDescription: (result: T) => ReactNode,
  fallbackError: string,
  onSuccess?: () => void,
): Promise<void> {
  try {
    const result = await action();
    toast.success("Success", { description: successDescription(result) });
    onSuccess?.();
  } catch (error) {
    toast.error("Error", {
      description: error instanceof Error ? error.message : fallbackError,
    });
  }
}
