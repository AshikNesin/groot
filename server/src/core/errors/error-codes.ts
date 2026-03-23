/**
 * Centralized error code registry
 *
 * All error codes (generic HTTP + domain-specific) are defined here
 * to ensure consistency and provide TypeScript autocomplete.
 */

export const ErrorCode = {
  // Generic HTTP errors
  BAD_REQUEST: { code: "BAD_REQUEST", status: 400, message: "Bad request" },
  UNAUTHORIZED: { code: "UNAUTHORIZED", status: 401, message: "Unauthorized" },
  FORBIDDEN: { code: "FORBIDDEN", status: 403, message: "Forbidden" },
  NOT_FOUND: { code: "NOT_FOUND", status: 404, message: "Resource not found" },
  CONFLICT: { code: "CONFLICT", status: 409, message: "Conflict" },
  VALIDATION_ERROR: { code: "VALIDATION_ERROR", status: 400, message: "Validation failed" },
  INTERNAL_ERROR: { code: "INTERNAL_ERROR", status: 500, message: "Internal server error" },

  // Rate limiting
  RATE_LIMIT_EXCEEDED: { code: "RATE_LIMIT_EXCEEDED", status: 429, message: "Rate limit exceeded" },
  UPLOAD_RATE_LIMIT_EXCEEDED: {
    code: "UPLOAD_RATE_LIMIT_EXCEEDED",
    status: 429,
    message: "Upload rate limit exceeded",
  },
  PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED: {
    code: "PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED",
    status: 429,
    message: "Download rate limit exceeded",
  },
  AI_RATE_LIMIT_EXCEEDED: {
    code: "AI_RATE_LIMIT_EXCEEDED",
    status: 429,
    message: "AI rate limit exceeded",
  },
  AI_STREAM_RATE_LIMIT_EXCEEDED: {
    code: "AI_STREAM_RATE_LIMIT_EXCEEDED",
    status: 429,
    message: "AI stream rate limit exceeded",
  },

  // Job domain
  JOB_NOT_FOUND: { code: "JOB_NOT_FOUND", status: 404, message: "Job not found" },
  JOB_NAME_INVALID: { code: "JOB_NAME_INVALID", status: 400, message: "Invalid job name" },
  JOB_VALIDATION_ERROR: {
    code: "JOB_VALIDATION_ERROR",
    status: 400,
    message: "Job validation failed",
  },
  JOB_SCHEDULE_VALIDATION_ERROR: {
    code: "JOB_SCHEDULE_VALIDATION_ERROR",
    status: 400,
    message: "Job schedule validation failed",
  },
  JOB_BULK_RERUN_VALIDATION_ERROR: {
    code: "JOB_BULK_RERUN_VALIDATION_ERROR",
    status: 400,
    message: "Bulk rerun validation failed",
  },

  // Storage/Share domain
  SHARE_ACCESS_DENIED: { code: "SHARE_ACCESS_DENIED", status: 403, message: "Share access denied" },
} as const;

export type ErrorCodeKey = keyof typeof ErrorCode;
export type ErrorCodeValue = (typeof ErrorCode)[ErrorCodeKey]["code"];
