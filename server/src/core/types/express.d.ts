import "express";
import type { Logger } from "pino";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
      };
      logger?: Logger;
      startTime?: number;
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}
