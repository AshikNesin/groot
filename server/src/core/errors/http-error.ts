/**
 * HTTP status code to standard error phrase mapping.
 */
const STATUS_PHRASES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a Teapot",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  425: "Too Early",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

export interface HttpErrorOutput {
  statusCode: number;
  error: string;
  message: string;
  code: string;
  data?: unknown;
}

/**
 * Unified HTTP error class inspired by @hapi/boom.
 *
 * Use the `Boom` factory namespace to create instances:
 *
 * ```ts
 * import { Boom } from "@/core/errors";
 *
 * throw Boom.notFound("User not found");
 * throw Boom.conflict("Email already taken", { email });
 * throw Boom.badRequest("Invalid input", validationErrors, "VALIDATION_ERROR");
 * ```
 */
export class HttpError extends Error {
  /** HTTP status code (e.g. 404, 500) */
  readonly statusCode: number;

  /** Machine-readable error code (e.g. "NOT_FOUND", "JOB_NAME_INVALID") */
  readonly code: string;

  /**
   * Whether this error is an expected, operational error (true)
   * or an unexpected programmer/system error (false).
   * 5xx errors default to false; 4xx default to true.
   */
  readonly isOperational: boolean;

  /** Arbitrary structured data attached to the error (like Boom's `data`). */
  readonly data?: unknown;

  constructor(
    statusCode: number,
    message?: string,
    data?: unknown,
    code?: string,
    cause?: Error,
  ) {
    const phrase = STATUS_PHRASES[statusCode] ?? "Unknown Error";
    super(message ?? phrase, { cause });

    this.statusCode = statusCode;
    this.code = code ?? statusCodeToCode(statusCode);
    this.isOperational = statusCode < 500;
    this.data = data;

    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  /** `true` when statusCode >= 500 */
  get isServer(): boolean {
    return this.statusCode >= 500;
  }

  /** Pre-formatted response payload, ready to send as JSON. */
  get output(): HttpErrorOutput {
    const base: HttpErrorOutput = {
      statusCode: this.statusCode,
      error: STATUS_PHRASES[this.statusCode] ?? "Unknown Error",
      message: this.message,
      code: this.code,
    };

    if (this.data !== undefined && this.data !== null) {
      base.data = this.data;
    }

    return base;
  }
}

/**
 * Derives a SCREAMING_SNAKE_CASE code from an HTTP status code.
 * e.g. 404 → "NOT_FOUND", 429 → "TOO_MANY_REQUESTS"
 */
function statusCodeToCode(statusCode: number): string {
  const phrase = STATUS_PHRASES[statusCode];
  if (!phrase) return `HTTP_${statusCode}`;
  return phrase.toUpperCase().replaceAll(/[^A-Z0-9]+/g, "_");
}
