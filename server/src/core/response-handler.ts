import type { Response } from "express";
import { ErrorCode, type ErrorCodeKey } from "./errors";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const ResponseHandler = {
  success<T>(res: Response, data: T, message?: string, statusCode = 200): Response<ApiResponse<T>> {
    return res.status(statusCode).json({ success: true, data, message });
  },

  created<T>(
    res: Response,
    data: T,
    message = "Resource created successfully",
  ): Response<ApiResponse<T>> {
    return ResponseHandler.success(res, data, message, 201);
  },

  error(
    res: Response,
    message: string,
    code: string,
    statusCode = 500,
    details?: unknown,
  ): Response<ApiResponse> {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
    });
  },

  /**
   * Convenience method using ErrorCode registry
   * @param errorCodeKey - Key from ErrorCode registry
   * @param messageOverride - Optional custom message (defaults to registry message)
   * @param details - Optional additional error details
   */
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

  notFound(res: Response, message = "Resource not found"): Response<ApiResponse> {
    return ResponseHandler.error(
      res,
      message,
      ErrorCode.NOT_FOUND.code,
      ErrorCode.NOT_FOUND.status,
    );
  },

  noContent(res: Response): Response {
    return res.status(204).send();
  },

  paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
  ): Response<ApiResponse<T[]>> {
    return res.status(200).json({
      success: true,
      data,
      metadata: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
};
