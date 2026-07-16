import { Writable } from "node:stream";
import pino, { type Logger } from "pino";
import pinoPretty from "pino-pretty";
import { prisma } from "@groot/core/database";
import { Prisma } from "@groot/core/database";
import { loggerConfig, isDevelopment, logLevel } from "@groot/core/logger";

// Reuse a single pino-pretty stream for all job loggers in development.
// Creating a new pinoPretty() per job is wasteful — it allocates a new
// Transform stream and SonicBoom writer on every job execution.
const devPrettyStream = isDevelopment
  ? pinoPretty({
      colorize: true,
      translateTime: "yyyy-mm-dd HH:MM:ss Z",
      ignore: "pid,hostname",
      singleLine: true,
    })
  : null;

export interface CreateJobLoggerOptions {
  jobId: string;
  jobName: string;
  additionalContext?: Record<string, unknown>;
}

interface LogEntry {
  level: string;
  time: number;
  msg?: string;
  message?: string;
  jobId?: string;
  jobName?: string;
  [key: string]: unknown;
}

export class JobLogStream extends Writable {
  private jobId: string;
  private jobName?: string;
  private buffer: LogEntry[] = [];
  private batchSize = 10;
  private flushInterval = 1000;
  private timer: NodeJS.Timeout | null = null;
  private isDestroyed = false;
  private retryCount = 0;
  private maxRetries = 3;

  constructor(jobId: string, jobName?: string) {
    super({ objectMode: true });
    this.jobId = jobId;
    this.jobName = jobName;
  }

  _write(
    chunk: string | Buffer | object,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (this.isDestroyed) {
      callback();
      return;
    }

    try {
      let entry: LogEntry;
      if (typeof chunk === "string") {
        entry = JSON.parse(chunk);
      } else if (Buffer.isBuffer(chunk)) {
        entry = JSON.parse(chunk.toString());
      } else {
        entry = chunk as LogEntry;
      }

      this.buffer.push(entry);

      if (this.buffer.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.flushInterval);
      }

      callback();
    } catch {
      callback();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const batch = [...this.buffer];
    this.buffer = [];

    try {
      const levelMap: Record<number, string> = {
        10: "trace",
        20: "debug",
        30: "info",
        40: "warn",
        50: "error",
        60: "fatal",
      };

      const createData: Prisma.JobLogCreateManyInput[] = batch.map((log) => {
        // jobId is intentionally destructured to strip it from `rest` (kept out of `data`); this.jobId overrides.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { level, time, msg, message, jobId, jobName, ...rest } = log;
        const levelStr = typeof level === "number" ? levelMap[level] || "info" : (level as string);

        return {
          jobId: this.jobId,
          jobName: this.jobName || (jobName as string) || "unknown",
          level: levelStr,
          message: msg || message || "",
          data: Object.keys(rest).length > 0 ? (rest as Prisma.InputJsonValue) : Prisma.JsonNull,
          timestamp: time ? new Date(time) : new Date(),
        };
      });

      await prisma.jobLog.createMany({
        data: createData,
      });
      this.retryCount = 0;
    } catch (err) {
      console.error("Failed to write job logs to DB", err);
      if (this.retryCount < this.maxRetries && !this.isDestroyed) {
        this.retryCount++;
        this.buffer = [...batch, ...this.buffer];
      } else {
        this.retryCount = 0;
      }
    }
  }

  _final(callback: (error?: Error | null) => void): void {
    this.flush()
      .then(() => callback())
      .catch((err) => callback(err));
  }

  _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    this.isDestroyed = true;
    if (this.timer) clearTimeout(this.timer);
    this.flush()
      .then(() => callback(error))
      .catch(() => callback(error));
  }
}

export function createJobLogStream(jobId: string, jobName?: string): JobLogStream {
  return new JobLogStream(jobId, jobName);
}

// Job-aware logger factory with DB persistence.
export function createJobLogger(options: CreateJobLoggerOptions): Logger {
  const { jobId, jobName, additionalContext = {} } = options;
  const dbStream = createJobLogStream(jobId, jobName);

  // biome-ignore lint/suspicious/noExplicitAny: streams array type is complex
  let streams: any[];
  if (isDevelopment && devPrettyStream) {
    streams = [{ stream: devPrettyStream }, { stream: dbStream }];
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
