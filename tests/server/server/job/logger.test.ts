import { describe, it, expect } from "vitest";
import { configureLogger } from "@groot/core/logger";
import { prisma } from "@groot/core/database";
import { createJobLogger, createJobLogStream } from "@groot/jobs/server/logger";

/**
 * createJobLogger — DB persistence must not be coupled to the ops log level.
 *
 * Regression tests for a bug where the pino ROOT level (set from
 * config.logging.level, "warn" in production) gated records before the DB
 * stream ever saw them: production jobs wrote ZERO rows to job_logs and the
 * dashboard showed nothing at all. The DB stream now has an `info` floor —
 * quieter ops levels only quiet the console, never the persisted history.
 *
 * configureLogger mutates the live `logLevel` binding that createJobLogger
 * reads at call time, so reconfiguring before each scenario simulates any
 * environment's configured level.
 */

async function persistLevelsAt(level: string): Promise<string[]> {
  configureLogger({ level, service: "logger-test", nodeEnv: "test" });
  const jobId = `logger-test-${level}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const logger = createJobLogger({ jobId, jobName: "test-job" });

  logger.trace("t");
  logger.debug("d");
  logger.info("i");
  logger.warn("w");
  logger.error("e");

  // JobLogStream batches writes with a 1s flush interval — wait for it.
  await new Promise((resolve) => setTimeout(resolve, 1600));

  const rows = await prisma.jobLog.findMany({
    where: { jobId },
    orderBy: { id: "asc" },
    select: { level: true },
  });
  return rows.map((r) => r.level);
}

describe("createJobLogger — DB persistence decoupled from ops level", () => {
  it("warn (production default): persists at least info+ despite the quieter ops level", async () => {
    const levels = await persistLevelsAt("warn");
    expect(levels).toContain("info");
    expect(levels).toContain("warn");
    expect(levels).toContain("error");
  });

  it("error (very quiet ops): still persists info+", async () => {
    const levels = await persistLevelsAt("error");
    expect(levels).toContain("info");
    expect(levels).toContain("error");
  });

  it("info: persists exactly info+", async () => {
    const levels = await persistLevelsAt("info");
    expect(levels).toEqual(["info", "warn", "error"]);
  });

  it("debug: honors the more verbose ops level (debug lines persist too)", async () => {
    const levels = await persistLevelsAt("debug");
    expect(levels).toEqual(["debug", "info", "warn", "error"]);
  });

  it("silent: persists nothing (explicit off is respected)", async () => {
    const levels = await persistLevelsAt("silent");
    expect(levels).toEqual([]);
  });
});

describe("createJobLogStream — raw stream passthrough", () => {
  it("persists numeric pino levels, mapping them to names", async () => {
    const jobId = `stream-test-${Date.now()}`;
    const stream = createJobLogStream(jobId, "test-job");
    stream.write(JSON.stringify({ level: 30, time: Date.now(), msg: "via stream" }));
    await new Promise((resolve) => setTimeout(resolve, 1600));
    const rows = await prisma.jobLog.findMany({ where: { jobId } });
    expect(rows.map((r) => r.level)).toEqual(["info"]);
    expect(rows[0]?.message).toBe("via stream");
  });
});
