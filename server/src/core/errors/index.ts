export { HttpError } from "./http-error";
export type { HttpErrorOutput } from "./http-error";
export { Boom } from "./boom";
export { ErrorCode, ErrorCodeEnum, type ErrorCodeKey, type ErrorCodeValue } from "./error-codes";
export { isPrismaError, handlePrismaError, PrismaHandler } from "./prisma-error-handler";

/**
 * Consolidated namespace for all error functionality.
 */
export const ErrorSystem = {
  Boom,
  ErrorCode,
  PrismaHandler,
} as const;
