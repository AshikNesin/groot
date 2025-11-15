import type { Response } from "express";

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

  created<T>(res: Response, data: T, message = "Resource created successfully"): Response<ApiResponse<T>> {
    return ResponseHandler.success(res, data, message, 201);
  },

  error(res: Response, message: string, code: string, statusCode = 500, details?: unknown): Response<ApiResponse> {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
    });
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
