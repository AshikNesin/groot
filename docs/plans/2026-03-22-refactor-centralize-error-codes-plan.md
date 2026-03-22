---
title: Centralize Error Codes in a Single Registry
type: refactor
status: completed
date: 2026-03-22
---

# Centralize Error Codes in a Single Registry

## Overview

Create a centralized `ErrorCode` registry that defines all error codes (generic HTTP + domain-specific) with their default status codes and messages. Both error classes and `ResponseHandler.error()` will reference this registry, eliminating hardcoded strings scattered across the codebase.

## Problem Statement

Currently, error codes are defined in multiple places:

- `base.errors.ts` — hardcoded in error class constructors (`"BAD_REQUEST"`, `"NOT_FOUND"`, etc.)
- Controllers — inline strings in `ResponseHandler.error()` calls (`"JOB_NOT_FOUND"`, `"JOB_NAME_INVALID"`)
- Middleware — rate limit codes (`"RATE_LIMIT_EXCEEDED"`, `"AI_RATE_LIMIT_EXCEEDED"`)

This leads to:

- Risk of typos and inconsistency
- No single source of truth for all possible codes
- No TypeScript autocomplete for error codes
- Difficult to audit all error codes in the system

## Proposed Solution

A single `ErrorCode` object using the `as const` pattern (matching `core/job/constants.ts`), with each entry containing `code`, `status`, and optional `message`.

## Technical Approach

### New File: `server/src/core/errors/error-codes.ts`

```typescript
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
```

### Update: `server/src/core/errors/index.ts`

Add export for the new registry:

```typescript
export { ErrorCode, type ErrorCodeKey, type ErrorCodeValue } from "./error-codes";
```

### Update: `server/src/core/errors/base.errors.ts`

Error classes use registry:

```typescript
import { ErrorCode } from "./error-codes";

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.BAD_REQUEST.status, ErrorCode.BAD_REQUEST.code);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, ErrorCode.NOT_FOUND.status, ErrorCode.NOT_FOUND.code);
  }
}
// ... similar for other classes
```

### Update: `server/src/core/response-handler.ts`

Add convenience method accepting ErrorCode entry:

```typescript
import { ErrorCode, type ErrorCodeKey } from "./errors";

export const ResponseHandler = {
  // Existing method stays for flexibility
  error(
    res: Response,
    message: string,
    code: string,
    statusCode = 500,
    details?: unknown,
  ): Response<ApiResponse> {
    return res.status(statusCode).json({
      success: false,
      error: { code, message, details },
    });
  },

  // New convenience method using registry
  errorFromCode(
    res: Response,
    errorCodeKey: ErrorCodeKey,
    messageOverride?: string,
    details?: unknown,
  ): Response<ApiResponse> {
    const entry = ErrorCode[errorCodeKey];
    return res.status(entry.status).json({
      success: false,
      error: {
        code: entry.code,
        message: messageOverride ?? entry.message,
        details,
      },
    });
  },
};
```

### Update Files Using Inline Codes

| File                                      | Changes                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| `controllers/job.controller.ts`           | Replace `"JOB_NOT_FOUND"` with `ErrorCode.JOB_NOT_FOUND.code` |
| `controllers/passkey.controller.ts`       | Replace `"UNAUTHORIZED"` with `ErrorCode.UNAUTHORIZED.code`   |
| `controllers/auth.controller.ts`          | Replace `"UNAUTHORIZED"` with `ErrorCode.UNAUTHORIZED.code`   |
| `middlewares/rate-limit.middleware.ts`    | Import and use `ErrorCode.*.code`                             |
| `middlewares/error-handler.middleware.ts` | Use `ErrorCode.INTERNAL_ERROR.code`                           |
| `controllers/public-file.controller.ts`   | Use `ErrorCode.SHARE_ACCESS_DENIED.code`                      |

## Acceptance Criteria

- [x] `error-codes.ts` created with all current error codes (generic + domain-specific)
- [x] Error classes in `base.errors.ts` use registry
- [x] `ResponseHandler` has `errorFromCode()` convenience method
- [x] All controllers updated to use registry codes
- [x] All middleware updated to use registry codes
- [x] `pnpm check` passes (lint + format)
- [x] `pnpm test` passes
- [x] TypeScript autocomplete works for error codes

## Migration Strategy

**Option A (Recommended):** Update all files in one PR — the change is straightforward and low-risk.

**Option B:** Incremental migration — add registry first, migrate files gradually. Not recommended since this is a simple refactor with clear scope.

## Files Changed

| File                                                 | Action |
| ---------------------------------------------------- | ------ |
| `server/src/core/errors/error-codes.ts`              | Create |
| `server/src/core/errors/index.ts`                    | Modify |
| `server/src/core/errors/base.errors.ts`              | Modify |
| `server/src/core/response-handler.ts`                | Modify |
| `server/src/controllers/job.controller.ts`           | Modify |
| `server/src/controllers/passkey.controller.ts`       | Modify |
| `server/src/controllers/auth.controller.ts`          | Modify |
| `server/src/controllers/public-file.controller.ts`   | Modify |
| `server/src/middlewares/rate-limit.middleware.ts`    | Modify |
| `server/src/middlewares/error-handler.middleware.ts` | Modify |

## Open Question

From brainstorm: Should `ResponseHandler.error()` accept the code key directly, or use a helper like `errorFromCode()`?

**Decision:** Use `errorFromCode()` as a convenience method while keeping the original `error()` for flexibility. This allows gradual adoption and handles edge cases where codes aren't in the registry.

## Sources & References

- Existing pattern: `server/src/core/job/constants.ts` — `as const` object pattern
- Error classes: `server/src/core/errors/base.errors.ts`
- Response handler: `server/src/core/response-handler.ts`
