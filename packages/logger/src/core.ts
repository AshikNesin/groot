import pino, { type Logger, type LoggerOptions } from "pino";
import dayjs from "dayjs";
import { serializeObject } from "./utils";

export interface LoggerRuntimeOptions {
  level: string;
  service: string;
  nodeEnv: string;
}

// Used only if the logger is accessed before configureLogger() (e.g. import-time
// log calls). configureLogger() runs from the server bootstrap before any real
// request handling, so production logs use configured values.
const FALLBACK: LoggerRuntimeOptions = {
  level: process.env.LOG_LEVEL ?? "info",
  service: process.env.LOG_SERVICE ?? "groot",
  nodeEnv: process.env.NODE_ENV ?? "development",
};

export const isDevelopment = (process.env.NODE_ENV ?? "development") !== "production";

function buildLoggerConfig(opts: LoggerRuntimeOptions): LoggerOptions {
  return {
    level: opts.level,
    base: {
      env: opts.nodeEnv,
      service: opts.service.toLowerCase(),
      pid: process.pid,
    },
    formatters: {
      level: (label: string) => ({ level: label }),
      log: (object: unknown): Record<string, unknown> => {
        const serialized = serializeObject(object);
        if (typeof serialized === "object" && serialized !== null) {
          const obj = serialized as Record<string, unknown>;
          if (!obj.timestamp) {
            obj.timestamp = dayjs().toISOString();
          }
          return obj;
        }
        return { value: serialized };
      },
    },
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
    ...(opts.nodeEnv !== "production" && {
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
}

export let logLevel: string = FALLBACK.level;
export let loggerConfig: LoggerOptions = buildLoggerConfig(FALLBACK);

let activeLogger: Logger = pino(loggerConfig);

/**
 * Configure the root logger from app config. Call once from the server
 * bootstrap (before request handling). Safe to call again to reconfigure.
 */
export function configureLogger(opts: LoggerRuntimeOptions): void {
  logLevel = opts.level;
  loggerConfig = buildLoggerConfig(opts);
  activeLogger = pino(loggerConfig);
}

/**
 * Stable lazy logger. Forwards every property access to the currently
 * configured pino instance (with correct `this` binding), so consumers that
 * capture `logger` before configureLogger() still see the configured instance
 * afterwards. `logger.child()` returns a real pino child logger.
 */
export const logger: Logger = new Proxy({} as Logger, {
  get(_target, prop) {
    const value = Reflect.get(activeLogger as object, prop, activeLogger);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(activeLogger)
      : value;
  },
});
