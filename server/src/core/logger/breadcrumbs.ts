/**
 * Breadcrumb tracking for debugging
 * Stores a trail of actions leading up to errors
 */
import dayjs from "dayjs";

export interface Breadcrumb {
  timestamp: string;
  category: string;
  message: string;
  level: "debug" | "info" | "warn" | "error";
  data?: Record<string, unknown>;
}

import { getLoggerContext } from "@/core/logger/context";

const MAX_BREADCRUMBS = 50;

/**
 * Add a breadcrumb to the trail
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: Breadcrumb["level"] = "info",
  data?: Record<string, unknown>,
): void {
  const breadcrumb: Breadcrumb = {
    timestamp: dayjs().toISOString(),
    category,
    message,
    level,
    data,
  };

  const context = getLoggerContext();
  if (!context) return; // If we aren't in a request context, simply drop it

  context.breadcrumbs.push(breadcrumb);

  // Keep only the last N breadcrumbs
  if (context.breadcrumbs.length > MAX_BREADCRUMBS) {
    context.breadcrumbs.shift();
  }
}

/**
 * Get all breadcrumbs
 */
export function getBreadcrumbs(): Breadcrumb[] {
  const context = getLoggerContext();
  if (!context) return [];
  return [...context.breadcrumbs];
}

/**
 * Clear all breadcrumbs
 */
export function clearBreadcrumbs(): void {
  const context = getLoggerContext();
  if (!context) return;
  context.breadcrumbs.length = 0;
}
