import { Prisma } from "@/generated/prisma/client";
import { Boom } from "./boom";

/**
 * Check if an error is a Prisma error
 */
export function isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientInitializationError
  );
}

/**
 * Handle Prisma errors and convert them to HttpError via Boom
 */
export function handlePrismaError(error: unknown): never {
  // Handle known Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        // Unique constraint violation
        const target = error.meta?.target as string[] | undefined;
        const field = target ? target[0] : "field";
        throw Boom.conflict(`A record with this ${field} already exists`);
      }

      case "P2025": {
        // Record not found
        throw Boom.notFound("Record not found");
      }

      case "P2003": {
        // Foreign key constraint failed
        throw Boom.badRequest("Cannot perform this operation due to related records");
      }

      case "P2014": {
        // Required relation violation
        throw Boom.badRequest("The change would violate the required relation");
      }

      case "P2021": {
        // Table does not exist
        throw Boom.badRequest("Database table does not exist");
      }

      case "P2022": {
        // Column does not exist
        throw Boom.badRequest("Database column does not exist");
      }

      default:
        throw Boom.badRequest(`Database error: ${error.message}`);
    }
  }

  // Handle validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    throw Boom.badRequest("Invalid data provided");
  }

  // Handle initialization errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    throw Boom.badRequest("Database connection error");
  }

  // Handle rust panic errors
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    throw Boom.badRequest("Database internal error");
  }

  // If not a Prisma error, rethrow
  throw error;
}
