import type { Request, Response, NextFunction } from "express";
import { sendSuccess } from "@groot/core/utils/api-response.utils";

/**
 * Wraps an asynchronous controller function that returns data.
 * If the function returns a value, it is automatically formatted
 * and sent as a JSON envelope `{ success: true, data }`.
 * If it returns `null` or `undefined`, a 204 No Content is sent (unless headers are already sent).
 * If the function throws an error, it is passed to `next()` for centralized error handling.
 *
 * To return a non-200 status, call `res.status(N)` before returning — the wrapper
 * honors `res.statusCode` (which defaults to 200).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Controller return type is intentionally dynamic
export const handle =
  (fn: (req: Request, res: Response) => Promise<any> | any) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await fn(req, res);

      // If headers were already sent (e.g. streaming, file downloads), don't try to send again
      if (res.headersSent) {
        return;
      }

      if (result === undefined || result === null) {
        res.status(204).send();
        return;
      }

      // Check if response status was explicitly set during the function, otherwise use 200
      const status = res.statusCode === 200 ? 200 : res.statusCode;
      sendSuccess(res, result, status);
    } catch (err) {
      next(err);
    }
  };
