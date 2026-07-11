/**
 * Logger utility functions
 */

/**
 * Serialize objects to handle BigInt and other non-cloneable values
 */
export function serializeObject(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 5) return "[MAX_DEPTH_REACHED]";

  // Handle primitives
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") return obj;

  // Handle BigInt
  if (typeof obj === "bigint") return obj.toString();

  // Handle Date
  if (obj instanceof Date) return obj.toISOString();

  // Handle Error objects
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
    };
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeObject(item, depth + 1));
  }

  // Handle Objects
  if (typeof obj === "object") {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      try {
        serialized[key] = serializeObject(value, depth + 1);
      } catch (error) {
        serialized[key] =
          `[SERIALIZATION_ERROR: ${error instanceof Error ? error.message : String(error)}]`;
      }
    }
    return serialized;
  }

  // Handle functions and other types
  return `[${typeof obj}]`;
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
export function sanitizeRequestBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;

  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "key",
    "auth",
    "authorization",
    "creditCard",
    "cvv",
    "ssn",
    "socialSecurityNumber",
    "bankAccount",
    "apiKey",
    "privateKey",
    "accessToken",
    "refreshToken",
  ];

  function sanitizeObject(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    if (obj && typeof obj === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
          result[key] = "[REDACTED]";
        } else if (typeof value === "object") {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return obj;
  }

  return sanitizeObject(body);
}
