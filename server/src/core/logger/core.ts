import pino, { type Logger } from "pino";
import dayjs from "dayjs";
import { env } from "@/core/env";
import { serializeObject } from "@/core/logger/utils";

export const isDevelopment = env.NODE_ENV !== "production";
export const logLevel = env.LOG_LEVEL;

export const loggerConfig = {
  level: logLevel,
  base: {
    env: env.NODE_ENV,
    service: "groot",
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
