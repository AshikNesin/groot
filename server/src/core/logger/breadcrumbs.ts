/**
 * Breadcrumb tracking for debugging
 * Stores a trail of actions leading up to errors
 */

export interface Breadcrumb {
  timestamp: string;
  category: string;
  message: string;
  level: "debug" | "info" | "warn" | "error";
  data?: Record<string, unknown>;
}

// Store breadcrumbs in AsyncLocalStorage for request-specific tracking
const breadcrumbs: Breadcrumb[] = [];
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
    timestamp: new Date().toISOString(),
    category,
    message,
    level,
    data,
  };

  breadcrumbs.push(breadcrumb);

  // Keep only the last N breadcrumbs
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

/**
 * Get all breadcrumbs
 */
export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

/**
 * Clear all breadcrumbs
 */
export function clearBreadcrumbs(): void {
  breadcrumbs.length = 0;
}
