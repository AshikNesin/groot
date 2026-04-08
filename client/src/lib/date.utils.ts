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
 * Format date with time (e.g., "Jan 1, 2024, 3:30 PM")
 */
export function formatDisplayDateTime(date: DateInput): string {
  return toDayjs(date).format("MMM D, YYYY, h:mm A");
}

/**
 * Format detailed date time (e.g., "January 1, 2024 at 3:30:45 PM")
 */
export function formatDetailedDateTime(date: DateInput): string {
  return toDayjs(date).format("MMMM D, YYYY [at] h:mm:ss A");
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
 * Get end of month
 */
export function endOfMonth(date: DateInput): Date {
  return toDayjs(date).endOf("month").toDate();
}

/**
 * Get start of month formatted as YYYY-MM-DD
 */
export function startOfMonthFormatted(date: DateInput): string {
  return formatDate(startOfMonth(date));
}

/**
 * Get end of month formatted as YYYY-MM-DD
 */
export function endOfMonthFormatted(date: DateInput): string {
  return formatDate(endOfMonth(date));
}

/**
 * Add days to a date
 */
export function addDays(date: DateInput, days: number): Date {
  return toDayjs(date).add(days, "day").toDate();
}

/**
 * Subtract days from a date
 */
export function subtractDays(date: DateInput, days: number): Date {
  return toDayjs(date).subtract(days, "day").toDate();
}

/**
 * Add months to a date
 */
export function addMonths(date: DateInput, months: number): Date {
  return toDayjs(date).add(months, "month").toDate();
}

/**
 * Subtract months from a date
 */
export function subtractMonths(date: DateInput, months: number): Date {
  return toDayjs(date).subtract(months, "month").toDate();
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: DateInput, date2: DateInput): boolean {
  return toDayjs(date1).isSame(toDayjs(date2), "day");
}

/**
 * Check if date1 is before date2
 */
export function isBefore(date1: DateInput, date2: DateInput): boolean {
  return toDayjs(date1).isBefore(toDayjs(date2));
}

/**
 * Check if date1 is after date2
 */
export function isAfter(date1: DateInput, date2: DateInput): boolean {
  return toDayjs(date1).isAfter(toDayjs(date2));
}

/**
 * Get current date range for the month
 */
export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = dayjs();
  return {
    start: now.startOf("month").toDate(),
    end: now.endOf("month").toDate(),
  };
}

/**
 * Format YYYY-MM (for month identifiers)
 */
export function formatYYYYMM(date: DateInput): string {
  return toDayjs(date).format("YYYY-MM");
}

/**
 * Parse YYYY-MM to Date (first day of month)
 */
export function parseYYYYMM(yyyymm: string): Date {
  return dayjs(yyyymm).startOf("month").toDate();
}

/**
 * Get current month in YYYY-MM format
 */
export function currentMonth(): string {
  return dayjs().format("YYYY-MM");
}

/**
 * Get month range in YYYY-MM-DD format
 */
export function getMonthRange(date: DateInput): { start: string; end: string } {
  const d = toDayjs(date);
  return {
    start: d.startOf("month").format("YYYY-MM-DD"),
    end: d.endOf("month").format("YYYY-MM-DD"),
  };
}
