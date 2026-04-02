/**
 * Date utility functions for backend using dayjs
 */
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

// Initialize dayjs plugins
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
 * Format date to ISO string
 */
export function formatISO(date: DateInput): string {
  return toDayjs(date).toISOString();
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
 * Add hours to a date
 */
export function addHours(date: DateInput, hours: number): Date {
  return toDayjs(date).add(hours, "hour").toDate();
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
 * Parse YYYY-MM-DD string to Date
 */
export function parseDate(dateString: string): Date {
  return dayjs(dateString).toDate();
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
 * Check if a date is expired (before now)
 */
export function isExpired(date: DateInput): boolean {
  return toDayjs(date).isBefore(dayjs());
}

/**
 * Get expiry date from now
 */
export function getExpiryDate(hours: number): Date {
  return dayjs().add(hours, "hour").toDate();
}
