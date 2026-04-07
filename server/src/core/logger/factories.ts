import { randomUUID } from "node:crypto";
import type { Request } from "express";
import pino, { type Logger } from "pino";
import pinoPretty from "pino-pretty";
import dayjs from "dayjs";
import { createJobLogStream } from "@/core/logger/job-stream";
import { logger, loggerConfig, isDevelopment, logLevel } from "@/core/logger/core";

export interface CreateRequestLoggerOptions {
  req: Request;
  additionalContext?: Record<string, unknown>;
}

export interface CreateJobLoggerOptions {
  jobId: string;
  jobName: string;
  additionalContext?: Record<string, unknown>;
}

export interface LogBusinessEventOptions {
  event: string;
  data: Record<string, unknown>;
  level?: "info" | "warn" | "error";
}

export interface LogPerformanceOptions {
  operation: string;
  duration: number;
  data?: Record<string, unknown>;
}

// Context-aware logger factory
export function createLogger(context: Record<string, unknown> = {}): Logger {
  return logger.child({
    ...context,
    loggerId: randomUUID().slice(0, 8),
  });
}

// Request-aware logger factory
export function createRequestLogger(options: CreateRequestLoggerOptions): Logger {
  const { req, additionalContext = {} } = options;
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

// Job-aware logger factory with DB persistence
export function createJobLogger(options: CreateJobLoggerOptions): Logger {
  const { jobId, jobName, additionalContext = {} } = options;
  const dbStream = createJobLogStream(jobId, jobName);

  // biome-ignore lint/suspicious/noExplicitAny: streams array type is complex
  let streams: any[];
  if (isDevelopment) {
    const pretty = pinoPretty({
      colorize: true,
      translateTime: "yyyy-mm-dd HH:MM:ss Z",
      ignore: "pid,hostname",
      singleLine: true,
    });

    streams = [{ stream: pretty }, { stream: dbStream }];
  } else {
    streams = [{ stream: process.stdout }, { stream: dbStream }];
  }

  // Create config without transport for multistream usage
  const jobLoggerConfig = {
    level: logLevel,
    base: loggerConfig.base,
    formatters: loggerConfig.formatters,
    serializers: loggerConfig.serializers,
  };

  const jobLogger = pino(jobLoggerConfig, pino.multistream(streams));

  return jobLogger.child({
    jobId,
    jobName,
    ...additionalContext,
  });
}

// Business event logger
export function logBusinessEvent(options: LogBusinessEventOptions): void {
  const { event, data, level = "info" } = options;
  logger[level](
    {
      type: "business_event",
      event,
      ...data,
      timestamp: dayjs().toISOString(),
    },
    `Business event: ${event}`,
  );
}

// Performance logger
export function logPerformance(options: LogPerformanceOptions): void {
  const { operation, duration, data = {} } = options;
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
