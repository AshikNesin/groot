import { Boom } from "@/core/errors";

/**
 * Parse and validate ID parameter
 */
export function parseId(value: string | undefined, paramName = "id"): number {
  if (value === undefined || value === null) {
    throw Boom.badRequest(`Missing ${paramName} parameter`);
  }

  // Validate that the entire string is numeric before parsing
  // This prevents parseInt from accepting partial numbers like '123abc' → 123
  if (!/^\d+$/.test(value)) {
    throw Boom.badRequest(`Invalid ${paramName} format`);
  }

  const id = Number.parseInt(value, 10);
  if (Number.isNaN(id) || id < 1) {
    throw Boom.badRequest(`Invalid ${paramName} format`);
  }

  return id;
}

/**
 * Parse and sanitize a limit query parameter
 * Returns a positive integer clamped to [1, maxLimit], or defaultValue if missing/invalid
 */
export function parseLimit(value: string | undefined, defaultValue = 50, maxLimit = 100): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return defaultValue;
  return Math.min(parsed, maxLimit);
}
