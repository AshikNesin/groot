import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Class name utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Format currency with locale support
export function formatCurrency(amount: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Format bytes to human readable format
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Truncate text with ellipsis
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}

// Generate initials from name
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Re-export all date utilities from centralized location
export {
  formatDate,
  formatYYYYMM,
  formatDisplayDate,
  formatDisplayDateTime,
  formatDetailedDateTime,
  formatLocaleDateTime,
  formatRelativeTime,
  getCurrentMonthRange,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfMonthFormatted,
  endOfMonthFormatted,
  addDays,
  subtractDays,
  addMonths,
  subtractMonths,
  isSameDay,
  isBefore,
  isAfter,
  parseYYYYMM,
  currentMonth,
  getMonthRange,
} from "@/lib/date.utils";

// Re-export design tokens for convenience
export {
  statusColors,
  pageLayout,
  sectionSpacing,
  cardLayout,
  iconSizes,
  typography,
  tableStyles,
  formStyles,
} from "@/lib/design-tokens";
