export { HttpError } from "@/core/errors/http-error";
export type { HttpErrorOutput } from "@/core/errors/http-error";
export { Boom } from "@/core/errors/boom";
export {
  ErrorCode,
  ErrorCodeEnum,
  type ErrorCodeKey,
  type ErrorCodeValue,
} from "@/core/errors/error-codes";
export {
  isPrismaError,
  handlePrismaError,
  PrismaHandler,
} from "@/core/errors/prisma-error-handler";

/**
 * Consolidated namespace for all error functionality.
 */
export const ErrorSystem = {
  Boom,
  ErrorCode,
  PrismaHandler,
} as const;
