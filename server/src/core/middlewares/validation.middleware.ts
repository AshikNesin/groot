import type { NextFunction, Request, Response } from "express";
import { type ZodSchema, z } from "zod";
import { Boom, ErrorCode } from "@/core/errors";

function createValidator(target: "body" | "query" | "params") {
  return function <T extends ZodSchema>(schema: T) {
    return (req: Request, _res: Response, next: NextFunction) => {
      try {
        req[target] = schema.parse(req[target] ?? {});
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
