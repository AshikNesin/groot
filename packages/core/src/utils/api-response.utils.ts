import type { Response } from "express";

/**
 * Unified API envelope shape, defined once and reused by the success and
 * error paths so they can never drift.
 *
 *   success → { success: true,  data }
 *   error   → { success: false, error: { code, message, details? } }
 */
export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

/** Send a success envelope. `status` defaults to 200. */
export function sendSuccess(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ success: true, data });
}

/** Send an error envelope with the given HTTP status. */
export function sendError(res: Response, error: ApiErrorPayload, status: number): void {
  res.status(status).json({ success: false, error });
}
