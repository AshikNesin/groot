import type { Request } from "express";
import { Boom } from "../errors";

/**
 * Express 5 types route params/query values loosely (params as `string | string[]`,
 * query values as `string | qs.ParsedQs | (string | qs.ParsedQs)[]`). Collapse to the
 * first string value (or undefined) before validating.
 */
type ParamValue = string | object | undefined;

function firstString(value: ParamValue): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }
  return undefined;
}

/**
 * Parse and validate ID parameter
 */
export function parseId(value: ParamValue, paramName = "id"): number {
  const resolved = firstString(value);
  if (resolved === undefined || resolved === null) {
    throw Boom.badRequest(`Missing ${paramName} parameter`);
  }

  // Validate that the entire string is numeric before parsing
  // This prevents parseInt from accepting partial numbers like '123abc' → 123
  if (!/^\d+$/.test(resolved)) {
    throw Boom.badRequest(`Invalid ${paramName} format`);
  }

  const id = Number.parseInt(resolved, 10);
  if (Number.isNaN(id) || id < 1) {
    throw Boom.badRequest(`Invalid ${paramName} format`);
  }

  return id;
}

/**
 * Parse a required string route parameter, collapsing Express 5's
 * `string | string[]` to a single string.
 */
export function parseStringParam(value: ParamValue, paramName = "param"): string {
  const resolved = firstString(value);
  if (resolved === undefined || resolved === null) {
    throw Boom.badRequest(`Missing ${paramName} parameter`);
  }
  return resolved;
}

/**
 * Parse and sanitize a limit query parameter
 * Returns a positive integer clamped to [1, maxLimit], or defaultValue if missing/invalid
 */
export function parseLimit(value: ParamValue, defaultValue = 50, maxLimit = 100): number {
  const resolved = firstString(value);
  // Reject anything that isn't a bare run of digits (e.g. "10junk", "1.5")
  // rather than letting parseInt silently truncate — consistent with parseId.
  if (resolved === undefined || !/^\d+$/.test(resolved)) return defaultValue;
  const parsed = Number.parseInt(resolved, 10);
  if (Number.isNaN(parsed) || parsed < 1) return defaultValue;
  return Math.min(parsed, maxLimit);
}

/**
 * Typed accessors for validated request parts.
 *
 * `validateBody/Query/Params` populate `req.validated.*`; controllers read
 * through these helpers instead of casting `req.body as DTO`, so the route's
 * Zod schema stays the single source of truth for the validated shape.
 */
export function validatedBody<T>(req: Request): T {
  return req.validated?.body as T;
}

export function validatedQuery<T>(req: Request): T {
  return req.validated?.query as T;
}

export function validatedParams<T>(req: Request): T {
  return req.validated?.params as T;
}

/**
 * Require an authenticated user on a route behind `jwtAuthMiddleware`.
 * Throws 401 if absent — defense in depth, since the middleware already
 * guarantees `req.user` is set on protected routes.
 */
export function requireUser(req: Request): { userId: number; email: string } {
  const user = req.user;
  if (!user) {
    throw Boom.unauthorized("Authentication required");
  }
  return user;
}
