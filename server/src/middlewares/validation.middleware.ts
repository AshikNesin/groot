import type { NextFunction, Request, Response } from "express";
import { type ZodSchema, z } from "zod";
import { ValidationError } from "@/core/errors/base.errors";

export type ValidationTarget = "body" | "query" | "params";

export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = req[target] ?? {};
      const validated = schema.parse(data);
      req.validated = {
        ...req.validated,
        [target]: validated,
      };
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of error.errors) {
          const field = issue.path.join(".") || "global";
          details[field] = [...(details[field] ?? []), issue.message];
        }
        throw new ValidationError("Validation failed", details);
      }
      next(error);
    }
  };
}
