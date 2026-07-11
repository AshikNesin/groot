export { HttpError } from "./http-error";
export type { HttpErrorOutput } from "./http-error";
export { Boom } from "./boom";
export { ErrorCode } from "./error-codes";
export type { ErrorCodeEnum, ErrorCodeKey, ErrorCodeValue } from "./error-codes";
export { isPrismaError, handlePrismaError, PrismaHandler } from "./prisma-error-handler";

import { Boom } from "./boom";
import { ErrorCode } from "./error-codes";
import { PrismaHandler } from "./prisma-error-handler";

/**
 * Consolidated namespace for all error functionality.
 */
export const ErrorSystem = {
  Boom,
  ErrorCode,
  PrismaHandler,
} as const;
