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

/**
 * Level gate for DB-persisted job logs.
 *
 * Decoupled from `config.logging.level`: that level is an ops concern
 * (console/stdout noise) and defaults to "warn" in production. The job
 * logger exists to power the dashboard's log viewer, which needs at least
 * `info` (handler progress lines) — gating the DB stream by the ops level
 * made production jobs write zero rows and the dashboard show "nothing at
 * all". So the DB stream persists at least info+ in every environment:
 * quieter ops settings only quiet the console, not the persisted history.
 * More verbose ops settings (debug/trace) pass through unchanged.
 */
const JOB_LOG_DB_FLOOR = "info";

const LOG_LEVEL_ORDER: Record<string, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

export function createJobLogStream(jobId: string, jobName?: string): JobLogStream {
  return new JobLogStream(jobId, jobName);
}

// Job-aware logger factory with DB persistence.
export function createJobLogger(options: CreateJobLoggerOptions): Logger {
  const { jobId, jobName, additionalContext = {} } = options;
  const dbStream = createJobLogStream(jobId, jobName);

  // Pino gates at the ROOT before any stream sees a record, so the root
  // level must be the most verbose of the sinks (numeric min — lower = more
  // verbose). The DB stream is never quieter than the info floor above: a
  // quieter ops level (production's "warn") only quiets the console; a more
  // verbose one (debug/trace) is honored by both sinks. "silent" silences
  // everything.
  const opsNumeric = LOG_LEVEL_ORDER[logLevel] ?? LOG_LEVEL_ORDER.info;
  const dbNumeric =
    logLevel === "silent" ? null : Math.min(opsNumeric, LOG_LEVEL_ORDER[JOB_LOG_DB_FLOOR]);
  const numericToLevel = (n: number | null): pino.Level =>
    n === null
      ? "silent"
      : ((Object.keys(LOG_LEVEL_ORDER).find((k) => LOG_LEVEL_ORDER[k] === n) ??
          JOB_LOG_DB_FLOOR) as pino.Level);
  const dbStreamLevel = numericToLevel(dbNumeric);
  const rootLevel = numericToLevel(dbNumeric === null ? null : Math.min(opsNumeric, dbNumeric));

  // biome-ignore lint/suspicious/noExplicitAny: streams array type is complex
  let streams: any[];
  if (isDevelopment && devPrettyStream) {
    streams = [
      { stream: devPrettyStream, level: logLevel },
      { stream: dbStream, level: dbStreamLevel },
    ];
  } else {
    streams = [
      { stream: process.stdout, level: logLevel },
      { stream: dbStream, level: dbStreamLevel },
    ];
  }

  // Create config without transport for multistream usage
  const jobLoggerConfig = {
    level: rootLevel,
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
