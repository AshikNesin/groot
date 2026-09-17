/**
 * Logger utility functions
 */

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
