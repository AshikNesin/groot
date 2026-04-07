import type { Request } from "express";
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
 * Parse boolean query parameter
 */
export function parseBoolean(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return value === "true";
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

/**
 * Parse pagination parameters
 */
export function parsePagination(req: Request) {
  const page = Math.max(1, Number.parseInt(req.query.page as string, 10) || 1);
  const rawLimit = Number.parseInt(req.query.limit as string, 10);
  // If limit is NaN or missing, default to 20; if 0 or negative, clamp to 1; max 100
  const defaultLimit = Number.isNaN(rawLimit) ? 20 : Math.max(1, rawLimit);
  const limit = Math.min(100, defaultLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Parse sorting parameters
 */
export function parseSorting(
  req: Request,
  allowedFields: string[],
  defaultField: string,
  defaultOrder: "asc" | "desc" = "desc",
) {
  const sortBy = (req.query.sortBy as string) || defaultField;
  const sortOrder = ((req.query.sortOrder as string) || defaultOrder) as "asc" | "desc";

  if (!allowedFields.includes(sortBy)) {
    throw Boom.badRequest(`Invalid sort field: ${sortBy}`);
  }

  if (!["asc", "desc"].includes(sortOrder)) {
    throw Boom.badRequest(`Invalid sort order: ${sortOrder}`);
  }

  return { sortBy, sortOrder };
}

/**
 * Extract only allowed fields from request body
 */
export function extractFields<T extends Record<string, unknown>>(
  data: unknown,
  allowedFields: (keyof T)[],
): Partial<T> {
  const result: Partial<T> = {};

  if (typeof data !== "object" || data === null) {
    return result;
  }

  const dataObj = data as Record<string, unknown>;

  for (const field of allowedFields) {
    if (Object.hasOwn(dataObj, field as string)) {
      result[field] = dataObj[field as string] as T[keyof T];
    }
  }

  return result;
}
