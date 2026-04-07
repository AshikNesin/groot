import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { Boom, ErrorCode } from "@/core/errors";

export const storageRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(
      Boom.tooManyRequests(
        "Too many storage operations from this IP, please try again later.",
        null,
        ErrorCode.RATE_LIMIT_EXCEEDED.code,
      ),
    );
  },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(
      Boom.tooManyRequests(
        "Too many file uploads from this IP, please try again later.",
        null,
        ErrorCode.UPLOAD_RATE_LIMIT_EXCEEDED.code,
      ),
    );
  },
});

export const publicFileRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(
      Boom.tooManyRequests(
        "Too many download requests, please try again later.",
        null,
        ErrorCode.PUBLIC_DOWNLOAD_RATE_LIMIT_EXCEEDED.code,
      ),
    );
  },
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(
      Boom.tooManyRequests(
        "Too many AI requests. Please try again later.",
        null,
        ErrorCode.AI_RATE_LIMIT_EXCEEDED.code,
      ),
    );
  },
});

export const aiStreamRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 streaming requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(
      Boom.tooManyRequests(
        "Too many streaming AI requests. Please try again later.",
        null,
        ErrorCode.AI_STREAM_RATE_LIMIT_EXCEEDED.code,
      ),
    );
  },
});
