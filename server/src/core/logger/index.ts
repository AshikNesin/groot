import { randomUUID } from "node:crypto";
import type { Request } from "express";
import pino, { type Logger } from "pino";
import { serializeObject } from "./utils";

// Enhanced logger configuration
const isDevelopment = process.env.NODE_ENV !== "production";
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info");

const loggerConfig = {
  level: logLevel,
  base: {
    env: process.env.NODE_ENV || "development",
    service: "express-react-boilerplate",
    pid: process.pid,
  },
  formatters: {
    level: (label: string) => ({ level: label }),
    log: (object: unknown) => {
      const serialized = serializeObject(object);
      if (typeof serialized === "object" && serialized !== null) {
        const obj = serialized as Record<string, unknown>;
        if (!obj.timestamp) {
          obj.timestamp = new Date().toISOString();
        }
      }
      return serialized;
    },
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  ...(isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "yyyy-mm-dd HH:MM:ss Z",
        ignore: "pid,hostname",
        singleLine: true,
      },
    },
  }),
};

export const logger: Logger = pino(loggerConfig);

// Context-aware logger factory
export function createLogger(context: Record<string, unknown> = {}): Logger {
  return logger.child({
    ...context,
    loggerId: randomUUID().slice(0, 8),
  });
}

// Request-aware logger factory
export function createRequestLogger(
  req: Request,
  additionalContext: Record<string, unknown> = {},
): Logger {
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();

  return logger.child({
    reqId: requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers["user-agent"],
    ip: req.ip || req.headers["x-forwarded-for"],
    ...additionalContext,
  });
}

// Job-aware logger factory
export function createJobLogger(
  jobId: string,
  jobName: string,
  additionalContext: Record<string, unknown> = {},
): Logger {
  return logger.child({
    jobId,
    jobName,
    ...additionalContext,
  });
}

// Business event logger
export function logBusinessEvent(
  event: string,
  data: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info",
): void {
  logger[level](
    {
      type: "business_event",
      event,
      ...data,
      timestamp: new Date().toISOString(),
    },
    `Business event: ${event}`,
  );
}

// Performance logger
export function logPerformance(
  operation: string,
  duration: number,
  data: Record<string, unknown> = {},
): void {
  const level = duration > 5000 ? "warn" : duration > 1000 ? "info" : "debug";
  logger[level](
    {
      type: "performance",
      operation,
      duration: `${duration}ms`,
      ...data,
    },
    `Performance: ${operation} completed in ${duration}ms`,
  );
}

// Export default instance for backward compatibility
export default logger;
