/**
 * Base error class for all custom application errors
 */
export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when request format is incorrect
 */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, "BAD_REQUEST");
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * Thrown when a resource is not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND");
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Thrown when user is not authenticated
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Thrown when user lacks permissions
 */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Thrown when request validation fails
 */
export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]> = {}) {
    super(message, 400, "VALIDATION_ERROR");
    Object.setPrototypeOf(this, ValidationError.prototype);
    this.errors = errors;
  }
}

/**
 * Thrown when there's a conflict (e.g., duplicate unique values)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Thrown for internal server errors
 */
export class InternalError extends AppError {
  constructor(message = "Internal server error") {
    super(message, 500, "INTERNAL_ERROR", false);
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}
