import pino from "pino";

const transport = pino.transport({
  target: "pino-pretty",
  options: {
    colorize: true,
    levelFirst: true,
    translateTime: "yyyy-mm-dd HH:MM:ss",
  },
});

export const logger = pino(
  {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    base: {
      env: process.env.NODE_ENV || "development",
    },
  },
  transport,
);

// Export default instance for direct use
export default logger;
