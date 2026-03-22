import { AppError } from "./base.errors";
import { ErrorCode } from "./error-codes";

type ErrorOptions = { message?: string; details?: Record<string, unknown> };

/**
 * Factory for creating AppError instances from ErrorCode definitions
 *
 * @example
 * throw ERROR_CODE.NOT_FOUND()
 * throw ERROR_CODE.NOT_FOUND({ message: "Job xyz not found" })
 * throw ERROR_CODE.JOB_NAME_INVALID({ details: { availableJobs: [...] } })
 */
export const ERROR_CODE = {
  // Generic HTTP errors
  BAD_REQUEST: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.BAD_REQUEST.message,
      ErrorCode.BAD_REQUEST.status,
      ErrorCode.BAD_REQUEST.code,
      true,
      opts?.details,
    ),
  UNAUTHORIZED: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.UNAUTHORIZED.message,
      ErrorCode.UNAUTHORIZED.status,
      ErrorCode.UNAUTHORIZED.code,
      true,
      opts?.details,
    ),
  FORBIDDEN: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.FORBIDDEN.message,
      ErrorCode.FORBIDDEN.status,
      ErrorCode.FORBIDDEN.code,
      true,
      opts?.details,
    ),
  NOT_FOUND: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.NOT_FOUND.message,
      ErrorCode.NOT_FOUND.status,
      ErrorCode.NOT_FOUND.code,
      true,
      opts?.details,
    ),
  CONFLICT: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.CONFLICT.message,
      ErrorCode.CONFLICT.status,
      ErrorCode.CONFLICT.code,
      true,
      opts?.details,
    ),
  VALIDATION_ERROR: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.VALIDATION_ERROR.message,
      ErrorCode.VALIDATION_ERROR.status,
      ErrorCode.VALIDATION_ERROR.code,
      true,
      opts?.details,
    ),
  INTERNAL_ERROR: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.INTERNAL_ERROR.message,
      ErrorCode.INTERNAL_ERROR.status,
      ErrorCode.INTERNAL_ERROR.code,
      false,
      opts?.details,
    ),

  // Rate limiting
  RATE_LIMIT_EXCEEDED: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.RATE_LIMIT_EXCEEDED.message,
      ErrorCode.RATE_LIMIT_EXCEEDED.status,
      ErrorCode.RATE_LIMIT_EXCEEDED.code,
      true,
      opts?.details,
    ),
  UPLOAD_RATE_LIMIT_EXCEEDED: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.UPLOAD_RATE_LIMIT_EXCEEDED.message,
      ErrorCode.UPLOAD_RATE_LIMIT_EXCEEDED.status,
      ErrorCode.UPLOAD_RATE_LIMIT_EXCEEDED.code,
      true,
      opts?.details,
    ),
  PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED.message,
      ErrorCode.PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED.status,
      ErrorCode.PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED.code,
      true,
      opts?.details,
    ),
  AI_RATE_LIMIT_EXCEEDED: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.AI_RATE_LIMIT_EXCEEDED.message,
      ErrorCode.AI_RATE_LIMIT_EXCEEDED.status,
      ErrorCode.AI_RATE_LIMIT_EXCEEDED.code,
      true,
      opts?.details,
    ),
  AI_STREAM_RATE_LIMIT_EXCEEDED: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.AI_STREAM_RATE_LIMIT_EXCEEDED.message,
      ErrorCode.AI_STREAM_RATE_LIMIT_EXCEEDED.status,
      ErrorCode.AI_STREAM_RATE_LIMIT_EXCEEDED.code,
      true,
      opts?.details,
    ),

  // Job domain
  JOB_NOT_FOUND: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.JOB_NOT_FOUND.message,
      ErrorCode.JOB_NOT_FOUND.status,
      ErrorCode.JOB_NOT_FOUND.code,
      true,
      opts?.details,
    ),
  JOB_NAME_INVALID: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.JOB_NAME_INVALID.message,
      ErrorCode.JOB_NAME_INVALID.status,
      ErrorCode.JOB_NAME_INVALID.code,
      true,
      opts?.details,
    ),
  JOB_VALIDATION_ERROR: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.JOB_VALIDATION_ERROR.message,
      ErrorCode.JOB_VALIDATION_ERROR.status,
      ErrorCode.JOB_VALIDATION_ERROR.code,
      true,
      opts?.details,
    ),
  JOB_SCHEDULE_VALIDATION_ERROR: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.JOB_SCHEDULE_VALIDATION_ERROR.message,
      ErrorCode.JOB_SCHEDULE_VALIDATION_ERROR.status,
      ErrorCode.JOB_SCHEDULE_VALIDATION_ERROR.code,
      true,
      opts?.details,
    ),
  JOB_BULK_RERUN_VALIDATION_ERROR: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.JOB_BULK_RERUN_VALIDATION_ERROR.message,
      ErrorCode.JOB_BULK_RERUN_VALIDATION_ERROR.status,
      ErrorCode.JOB_BULK_RERUN_VALIDATION_ERROR.code,
      true,
      opts?.details,
    ),

  // Storage/Share domain
  SHARE_ACCESS_DENIED: (opts?: ErrorOptions) =>
    new AppError(
      opts?.message ?? ErrorCode.SHARE_ACCESS_DENIED.message,
      ErrorCode.SHARE_ACCESS_DENIED.status,
      ErrorCode.SHARE_ACCESS_DENIED.code,
      true,
      opts?.details,
    ),
} as const;
