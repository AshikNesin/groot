/**
 * Centralized error code registry.
 *
 * A single `const` object instead of an `enum` + a separate `Record` —
 * one source of truth, zero enum overhead, full literal-type narrowing via `satisfies`.
 *
 * Add entries here only for domain-specific codes that carry meaning beyond
 * the HTTP status. Standard codes (BAD_REQUEST, NOT_FOUND, …) map cleanly
 * to their HTTP status so they live here too.
 *
 * Call sites are unchanged: `ErrorCode.NOT_FOUND`, `ErrorCode.VALIDATION_ERROR`, etc.
 */
export const ErrorCode = {
  // ── Generic HTTP ──────────────────────────────────────────────────────
  BAD_REQUEST: { code: "BAD_REQUEST", status: 400 },
  UNAUTHORIZED: { code: "UNAUTHORIZED", status: 401 },
  FORBIDDEN: { code: "FORBIDDEN", status: 403 },
  NOT_FOUND: { code: "NOT_FOUND", status: 404 },
  CONFLICT: { code: "CONFLICT", status: 409 },
  VALIDATION_ERROR: { code: "VALIDATION_ERROR", status: 400 },
  INTERNAL_ERROR: { code: "INTERNAL_ERROR", status: 500 },

  // ── Rate limiting ─────────────────────────────────────────────────────
  RATE_LIMIT_EXCEEDED: { code: "RATE_LIMIT_EXCEEDED", status: 429 },
  UPLOAD_RATE_LIMIT_EXCEEDED: { code: "UPLOAD_RATE_LIMIT_EXCEEDED", status: 429 },
  PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED: { code: "PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED", status: 429 },
  AI_RATE_LIMIT_EXCEEDED: { code: "AI_RATE_LIMIT_EXCEEDED", status: 429 },
  AI_STREAM_RATE_LIMIT_EXCEEDED: { code: "AI_STREAM_RATE_LIMIT_EXCEEDED", status: 429 },

  // ── Job domain ────────────────────────────────────────────────────────
  JOB_NOT_FOUND: { code: "JOB_NOT_FOUND", status: 404 },
  JOB_NAME_INVALID: { code: "JOB_NAME_INVALID", status: 400 },
  JOB_VALIDATION_ERROR: { code: "JOB_VALIDATION_ERROR", status: 400 },
  JOB_SCHEDULE_VALIDATION_ERROR: { code: "JOB_SCHEDULE_VALIDATION_ERROR", status: 400 },
  JOB_BULK_RERUN_VALIDATION_ERROR: { code: "JOB_BULK_RERUN_VALIDATION_ERROR", status: 400 },

  // ── Storage / Share domain ───────────────────────────────────────────
  SHARE_ACCESS_DENIED: { code: "SHARE_ACCESS_DENIED", status: 403 },
} satisfies Record<string, { code: string; status: number }>;

export type ErrorCodeKey = keyof typeof ErrorCode;
export type ErrorCodeValue = (typeof ErrorCode)[ErrorCodeKey]["code"];

// Kept for backwards compat — same values, now derived from the const object above.
export type ErrorCodeEnum = ErrorCodeValue;
