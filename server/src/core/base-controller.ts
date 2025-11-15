import type { Request } from "express";
import { BadRequestError } from "@/core/errors/base.errors";

export abstract class BaseController {
  protected parseId(value: string | undefined, paramName = "id"): number {
    if (!value) {
      throw new BadRequestError(`Missing ${paramName} parameter`);
    }

    if (!/^[0-9]+$/.test(value)) {
      throw new BadRequestError(`Invalid ${paramName} format`);
    }

    const id = Number.parseInt(value, 10);
    if (Number.isNaN(id) || id < 1) {
      throw new BadRequestError(`Invalid ${paramName} format`);
    }

    return id;
  }

  protected parseBoolean(value: string | undefined, defaultValue = false): boolean {
    if (value === undefined) {
      return defaultValue;
    }
    return value === "true";
  }

  protected parsePagination(req: Request) {
    const page = Math.max(1, Number.parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Number.parseInt(req.query.limit as string, 10) || 20);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }
}
