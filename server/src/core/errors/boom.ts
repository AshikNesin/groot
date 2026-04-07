import { HttpError } from "@/core/errors/http-error";
import type { ErrorCodeValue } from "@/core/errors/error-codes";

type BoomData = unknown;

export interface BoomOptions {
  message?: string;
  data?: BoomData;
  code?: ErrorCodeValue;
  cause?: Error;
}

/**
 * Create a factory function for a given HTTP status code.
 */
function createFactory(statusCode: number) {
  function factory(options: BoomOptions): HttpError;
  function factory(message?: string, data?: BoomData, code?: ErrorCodeValue): HttpError;
  function factory(
    messageOrOptions?: string | BoomOptions,
    data?: BoomData,
    code?: ErrorCodeValue,
  ): HttpError {
    if (typeof messageOrOptions === "object" && messageOrOptions !== null) {
      return new HttpError(
        statusCode,
        messageOrOptions.message,
        messageOrOptions.data,
        messageOrOptions.code,
        messageOrOptions.cause,
      );
    }
    return new HttpError(statusCode, messageOrOptions as string | undefined, data, code);
  }
  return factory;
}

/**
 * Boom-style error factory namespace.
 *
 * Every method returns an `HttpError` instance — just throw it.
 *
 * @example
 * ```ts
 * // Basic usage
 * throw Boom.notFound("User not found");
 *
 * // With structured data
 * throw Boom.conflict("Email already taken", { email: "a@b.com" });
 *
 * // With custom error code for domain-specific errors
 * throw Boom.notFound("Job not found", { jobId }, "JOB_NOT_FOUND");
 *
 * // Type guard
 * if (Boom.isHttpError(err)) { ... }
 *
 * // Wrap unknown errors
 * throw Boom.boomify(unknownErr);
 * ```
 */
export const Boom = {
  // ── HTTP 4xx ──────────────────────────────────────────────

  /** 400 Bad Request */
  badRequest: createFactory(400),

  /** 401 Unauthorized */
  unauthorized: createFactory(401),

  /** 402 Payment Required */
  paymentRequired: createFactory(402),

  /** 403 Forbidden */
  forbidden: createFactory(403),

  /** 404 Not Found */
  notFound: createFactory(404),

  /** 405 Method Not Allowed */
  methodNotAllowed: createFactory(405),

  /** 406 Not Acceptable */
  notAcceptable: createFactory(406),

  /** 408 Request Timeout */
  clientTimeout: createFactory(408),

  /** 409 Conflict */
  conflict: createFactory(409),

  /** 410 Gone */
  gone: createFactory(410),

  /** 413 Payload Too Large */
  entityTooLarge: createFactory(413),

  /** 415 Unsupported Media Type */
  unsupportedMediaType: createFactory(415),

  /** 418 I'm a Teapot */
  teapot: createFactory(418),

  /** 422 Unprocessable Entity */
  unprocessable: createFactory(422),

  /** 423 Locked */
  locked: createFactory(423),

  /** 429 Too Many Requests */
  tooManyRequests: createFactory(429),

  /** 451 Unavailable For Legal Reasons */
  illegal: createFactory(451),

  // ── HTTP 5xx ──────────────────────────────────────────────

  /** 500 Internal Server Error */
  internal: createFactory(500),

  /** 501 Not Implemented */
  notImplemented: createFactory(501),

  /** 502 Bad Gateway */
  badGateway: createFactory(502),

  /** 503 Service Unavailable */
  unavailable: createFactory(503),

  /** 504 Gateway Timeout */
  gatewayTimeout: createFactory(504),

  // ── Utilities ─────────────────────────────────────────────

  /**
   * Type guard: returns `true` if the value is an `HttpError` instance.
   */
  isHttpError(err: unknown): err is HttpError {
    return err instanceof HttpError;
  },

  /**
   * Wraps any error into an `HttpError`.
   *
   * If the error is already an `HttpError`, returns it as-is.
   * Otherwise creates a 500 Internal Server Error with the original as `cause`.
   */
  boomify(err: unknown, options?: { statusCode?: number; message?: string }): HttpError {
    if (err instanceof HttpError) return err;

    const statusCode = options?.statusCode ?? 500;
    const message =
      options?.message ?? (err instanceof Error ? err.message : "An unexpected error occurred");
    const cause = err instanceof Error ? err : undefined;

    return new HttpError(statusCode, message, undefined, undefined, cause);
  },
} as const;
