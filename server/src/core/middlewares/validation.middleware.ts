import type { NextFunction, Request, Response } from "express";
import { type ZodSchema, z } from "zod";
import { Boom, ErrorCode } from "@/core/errors";

declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

function createValidator(target: "body" | "query" | "params") {
  return function <T extends ZodSchema>(schema: T) {
    return (req: Request, _res: Response, next: NextFunction) => {
      try {
        const parsed = schema.parse(req[target] ?? {});
        req.validated = req.validated ?? {};
        req.validated[target] = parsed;
        if (target === "body") {
          req.body = parsed;
        }
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of error.errors) {
            const field = issue.path.join(".") || "global";
            details[field] = [...(details[field] ?? []), issue.message];
          }
          throw Boom.badRequest("Validation failed", details, ErrorCode.VALIDATION_ERROR.code);
        }
        next(error);
      }
    };
  };
}

export const validateBody = createValidator("body");
export const validateQuery = createValidator("query");
export const validateParams = createValidator("params");
