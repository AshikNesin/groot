/**
 * Date utility functions for frontend using dayjs
 */
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";

// Initialize dayjs plugins
dayjs.extend(relativeTime);
dayjs.extend(utc);

type DateInput = Date | string | number;

/**
 * Normalize date input to dayjs object
 */
function toDayjs(date: DateInput): dayjs.Dayjs {
  return dayjs(date);
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: DateInput): string {
  return toDayjs(date).format("YYYY-MM-DD");
}

/**
 * Format date to display format (e.g., "Jan 1, 2024")
 */
export function formatDisplayDate(date: DateInput): string {
  return toDayjs(date).format("MMM D, YYYY");
}

/**
 * Format date time for locale
 */
export function formatLocaleDateTime(date: DateInput): string {
  return toDayjs(date).format("M/D/YYYY, h:mm:ss A");
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: DateInput): string {
  return toDayjs(date).fromNow();
}

/**
 * Get start of day (00:00:00)
 */
export function startOfDay(date: DateInput): Date {
  return toDayjs(date).startOf("day").toDate();
}

/**
 * Get end of day (23:59:59.999)
 */
export function endOfDay(date: DateInput): Date {
  return toDayjs(date).endOf("day").toDate();
}

/**
 * Get start of month
 */
export function startOfMonth(date: DateInput): Date {
  return toDayjs(date).startOf("month").toDate();
}

/**
 * Subtract days from a date
 */
export function subtractDays(date: DateInput, days: number): Date {
  return toDayjs(date).subtract(days, "day").toDate();
}

/**
 * Format duration between two dates (e.g., "2.35s")
 */
export function formatDuration(start: DateInput, end: DateInput): string {
  const duration = toDayjs(end).diff(toDayjs(start), "second", true);
  return `${duration.toFixed(2)}s`;
}
