import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { Boom, ErrorCode } from "@/core/errors";
import { config } from "@/core/config";

export const storageRateLimiter = rateLimit({
  windowMs: config.rateLimits.storage.windowMs,
  max: config.rateLimits.storage.max,
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
  windowMs: config.rateLimits.upload.windowMs,
  max: config.rateLimits.upload.max,
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
  windowMs: config.rateLimits.publicFile.windowMs,
  max: config.rateLimits.publicFile.max,
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
  windowMs: config.rateLimits.ai.windowMs,
  max: config.rateLimits.ai.max,
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
  windowMs: config.rateLimits.aiStream.windowMs,
  max: config.rateLimits.aiStream.max,
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
