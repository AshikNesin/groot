import type { Request } from "express";
import { BadRequestError } from "@/core/errors";

/**
 * Base controller with common utilities
 */
export abstract class BaseController {
  /**
   * Parse and validate ID parameter
   */
  protected parseId(value: string | undefined, paramName = "id"): number {
    if (value === undefined || value === null) {
      throw new BadRequestError(`Missing ${paramName} parameter`);
    }

    // Validate that the entire string is numeric before parsing
    // This prevents parseInt from accepting partial numbers like '123abc' → 123
    if (!/^\d+$/.test(value)) {
      throw new BadRequestError(`Invalid ${paramName} format`);
    }

    const id = Number.parseInt(value, 10);
    if (Number.isNaN(id) || id < 1) {
      throw new BadRequestError(`Invalid ${paramName} format`);
    }

    return id;
  }

  /**
   * Parse boolean query parameter
   */
  protected parseBoolean(value: string | undefined, defaultValue = false): boolean {
    if (value === undefined) return defaultValue;
    return value === "true";
  }

  /**
   * Parse pagination parameters
   */
  protected parsePagination(req: Request) {
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
  protected parseSorting(
    req: Request,
    allowedFields: string[],
    defaultField: string,
    defaultOrder: "asc" | "desc" = "desc",
  ) {
    const sortBy = (req.query.sortBy as string) || defaultField;
    const sortOrder = ((req.query.sortOrder as string) || defaultOrder) as "asc" | "desc";

    if (!allowedFields.includes(sortBy)) {
      throw new BadRequestError(`Invalid sort field: ${sortBy}`);
    }

    if (!["asc", "desc"].includes(sortOrder)) {
      throw new BadRequestError(`Invalid sort order: ${sortOrder}`);
    }

    return { sortBy, sortOrder };
  }

  /**
   * Extract only allowed fields from request body
   */
  protected extractFields<T extends Record<string, unknown>>(
    data: unknown,
    allowedFields: (keyof T)[],
  ): Partial<T> {
    const result: Partial<T> = {};
    const dataObj = data as Record<string, unknown>;

    for (const field of allowedFields) {
      if (Object.hasOwn(dataObj, field as string)) {
        result[field] = dataObj[field as string] as T[keyof T];
      }
    }

    return result;
  }
}
