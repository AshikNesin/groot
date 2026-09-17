// Class name utility — reuse the single implementation from @groot/ui.
export { cn } from "@groot/ui/lib/utils";

// Format bytes to human readable format
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

// Re-export date utilities from centralized location
export {
  formatDate,
  formatDisplayDate,
  formatLocaleDateTime,
  formatRelativeTime,
  startOfDay,
  endOfDay,
  startOfMonth,
  subtractDays,
  formatDuration,
} from "./date.utils";
