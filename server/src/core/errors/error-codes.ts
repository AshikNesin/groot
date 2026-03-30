/**
 * Centralized error code registry
 *
 * These are the domain-specific error codes used throughout the app.
 * Standard HTTP codes (BAD_REQUEST, NOT_FOUND, etc.) are automatically
 * derived by HttpError from the status code — you don't need entries here
 * for those.
 *
 * Add entries here only for domain-specific codes that carry
 * meaning beyond the HTTP status.
 */
export enum ErrorCodeEnum {
  // Generic HTTP errors
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",

  // Rate limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  UPLOAD_RATE_LIMIT_EXCEEDED = "UPLOAD_RATE_LIMIT_EXCEEDED",
  PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED = "PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED",
  AI_RATE_LIMIT_EXCEEDED = "AI_RATE_LIMIT_EXCEEDED",
  AI_STREAM_RATE_LIMIT_EXCEEDED = "AI_STREAM_RATE_LIMIT_EXCEEDED",

  // Job domain
  JOB_NOT_FOUND = "JOB_NOT_FOUND",
  JOB_NAME_INVALID = "JOB_NAME_INVALID",
  JOB_VALIDATION_ERROR = "JOB_VALIDATION_ERROR",
  JOB_SCHEDULE_VALIDATION_ERROR = "JOB_SCHEDULE_VALIDATION_ERROR",
  JOB_BULK_RERUN_VALIDATION_ERROR = "JOB_BULK_RERUN_VALIDATION_ERROR",

  // Storage/Share domain
  SHARE_ACCESS_DENIED = "SHARE_ACCESS_DENIED",
}

/**
 * Status code mapping for each error code.
 * Used by `ResponseHandler.errorFromCode()`.
 */
export const ErrorCode: Record<ErrorCodeEnum, { code: ErrorCodeEnum; status: number }> = {
  [ErrorCodeEnum.BAD_REQUEST]: { code: ErrorCodeEnum.BAD_REQUEST, status: 400 },
  [ErrorCodeEnum.UNAUTHORIZED]: { code: ErrorCodeEnum.UNAUTHORIZED, status: 401 },
  [ErrorCodeEnum.FORBIDDEN]: { code: ErrorCodeEnum.FORBIDDEN, status: 403 },
  [ErrorCodeEnum.NOT_FOUND]: { code: ErrorCodeEnum.NOT_FOUND, status: 404 },
  [ErrorCodeEnum.CONFLICT]: { code: ErrorCodeEnum.CONFLICT, status: 409 },
  [ErrorCodeEnum.VALIDATION_ERROR]: { code: ErrorCodeEnum.VALIDATION_ERROR, status: 400 },
  [ErrorCodeEnum.INTERNAL_ERROR]: { code: ErrorCodeEnum.INTERNAL_ERROR, status: 500 },
  [ErrorCodeEnum.RATE_LIMIT_EXCEEDED]: { code: ErrorCodeEnum.RATE_LIMIT_EXCEEDED, status: 429 },
  [ErrorCodeEnum.UPLOAD_RATE_LIMIT_EXCEEDED]: { code: ErrorCodeEnum.UPLOAD_RATE_LIMIT_EXCEEDED, status: 429 },
  [ErrorCodeEnum.PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED]: { code: ErrorCodeEnum.PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED, status: 429 },
  [ErrorCodeEnum.AI_RATE_LIMIT_EXCEEDED]: { code: ErrorCodeEnum.AI_RATE_LIMIT_EXCEEDED, status: 429 },
  [ErrorCodeEnum.AI_STREAM_RATE_LIMIT_EXCEEDED]: { code: ErrorCodeEnum.AI_STREAM_RATE_LIMIT_EXCEEDED, status: 429 },
  [ErrorCodeEnum.JOB_NOT_FOUND]: { code: ErrorCodeEnum.JOB_NOT_FOUND, status: 404 },
  [ErrorCodeEnum.JOB_NAME_INVALID]: { code: ErrorCodeEnum.JOB_NAME_INVALID, status: 400 },
  [ErrorCodeEnum.JOB_VALIDATION_ERROR]: { code: ErrorCodeEnum.JOB_VALIDATION_ERROR, status: 400 },
  [ErrorCodeEnum.JOB_SCHEDULE_VALIDATION_ERROR]: { code: ErrorCodeEnum.JOB_SCHEDULE_VALIDATION_ERROR, status: 400 },
  [ErrorCodeEnum.JOB_BULK_RERUN_VALIDATION_ERROR]: { code: ErrorCodeEnum.JOB_BULK_RERUN_VALIDATION_ERROR, status: 400 },
  [ErrorCodeEnum.SHARE_ACCESS_DENIED]: { code: ErrorCodeEnum.SHARE_ACCESS_DENIED, status: 403 },
};

export type ErrorCodeKey = keyof typeof ErrorCode;
export type ErrorCodeValue = ErrorCodeEnum;
