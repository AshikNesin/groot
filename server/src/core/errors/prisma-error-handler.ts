import { Prisma } from "@/generated/prisma/client";
import { Boom } from "@/core/errors/boom";
import type { HttpError } from "@/core/errors/http-error";

export type PrismaErrorHandlerFn = (error: Prisma.PrismaClientKnownRequestError) => HttpError;

const defaultRegistry: Record<string, PrismaErrorHandlerFn> = {
  P2002: (error) => {
    const target = error.meta?.target as string[] | undefined;
    const field = target ? target[0] : "field";
    return Boom.conflict(`A record with this ${field} already exists`);
  },
  P2025: () => Boom.notFound("Record not found"),
  P2003: () => Boom.badRequest("Cannot perform this operation due to related records"),
  P2014: () => Boom.badRequest("The change would violate the required relation"),
  P2021: () => Boom.badRequest("Database table does not exist"),
  P2022: () => Boom.badRequest("Database column does not exist"),
};

export const PrismaHandler = {
  registry: { ...defaultRegistry } as Record<string, PrismaErrorHandlerFn>,

  isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientValidationError ||
      error instanceof Prisma.PrismaClientRustPanicError ||
      error instanceof Prisma.PrismaClientInitializationError
    );
  },

  registerHandler(code: string, handler: PrismaErrorHandlerFn) {
    this.registry[code] = handler;
  },

  handle(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const handler = this.registry[error.code];
      if (handler) {
        throw handler(error); // Handler returns HttpError, we throw it
      }
      throw Boom.badRequest(`Database error: ${error.message}`);
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      throw Boom.badRequest("Invalid data provided");
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      throw Boom.badRequest("Database connection error");
    }

    if (error instanceof Prisma.PrismaClientRustPanicError) {
      throw Boom.badRequest("Database internal error");
    }

    throw error;
  },
};

// Backwards compatibility for existing imports
export const isPrismaError = PrismaHandler.isPrismaError;
export const handlePrismaError = (error: unknown) => PrismaHandler.handle(error);
