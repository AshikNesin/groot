import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { ErrorCode } from "@/core/errors";

export const storageRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(ErrorCode.RATE_LIMIT_EXCEEDED.status).json({
      success: false,
      error: {
        code: ErrorCode.RATE_LIMIT_EXCEEDED.code,
        message: "Too many storage operations from this IP, please try again later.",
      },
    });
  },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(ErrorCode.UPLOAD_RATE_LIMIT_EXCEEDED.status).json({
      success: false,
      error: {
        code: ErrorCode.UPLOAD_RATE_LIMIT_EXCEEDED.code,
        message: "Too many file uploads from this IP, please try again later.",
      },
    });
  },
});

export const publicFileRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(ErrorCode.PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED.status).json({
      success: false,
      error: {
        code: ErrorCode.PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED.code,
        message: "Too many download requests, please try again later.",
      },
    });
  },
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(ErrorCode.AI_RATE_LIMIT_EXCEEDED.status).json({
      success: false,
      error: {
        code: ErrorCode.AI_RATE_LIMIT_EXCEEDED.code,
        message: "Too many AI requests. Please try again later.",
      },
    });
  },
});

export const aiStreamRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 streaming requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(ErrorCode.AI_STREAM_RATE_LIMIT_EXCEEDED.status).json({
      success: false,
      error: {
        code: ErrorCode.AI_STREAM_RATE_LIMIT_EXCEEDED.code,
        message: "Too many streaming AI requests. Please try again later.",
      },
    });
  },
});
