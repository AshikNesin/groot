import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { HonkerAdapter } from "@groot/jobs/server/honker-adapter";
import type { JobContext } from "@groot/jobs/server/adapter";
import { resolveSqlitePath } from "@groot/core/database/client";
import { isSqlite } from "@groot/core/database/engine";

// These tests exercise the honker adapter against a real SQLite file. They
// prove enqueue → claim → deliver → ack/retry/dead-letter end-to-end on
// SQLite, which is the whole point of the dual-engine jobs work. Skipped on
// Postgres — honker is the SQLite-only adapter.
const DB_PATH = resolveSqlitePath("file:./tmp/honker-adapter-test.db");

// runIfSqlite wraps a describe so the whole suite is skipped on Postgres. The
// adapter hard-codes a SQLite file path, so importing/instantiating it on
// Postgres would fail at construction.
const runIfSqlite = isSqlite ? describe : describe.skip;

runIfSqlite("HonkerAdapter (SQLite job queue)", () => {
  let adapter: HonkerAdapter;

  beforeEach(() => {
    adapter = new HonkerAdapter();
  });

  afterEach(async () => {
    await adapter.stop();
  });

  it("enqueues a job and a worker receives and acks it", async () => {
    const received: JobContext[] = [];
    let resolveWork!: () => void;
    const workDone = new Promise<void>((r) => (resolveWork = r));

    await adapter.start();
    await adapter.createQueue("echo");
    await adapter.work("echo", { pollingIntervalSeconds: 1, batchSize: 1 }, async (jobs) => {
      received.push(...jobs);
      resolveWork();
    });

    const jobId = await adapter.send("echo", { msg: "hello" });
    expect(typeof jobId).toBe("string");

    await workDone;
    expect(received).toHaveLength(1);
    expect(received[0].name).toBe("echo");
    expect(received[0].data).toEqual({ msg: "hello" });
  });

  it("retries a failing job then dead-letters after max attempts", async () => {
    let attempts = 0;
    await adapter.start();
    await adapter.createQueue("flaky");
    // Short retry delay so the test resolves quickly.
    await adapter.work("flaky", { pollingIntervalSeconds: 1, batchSize: 1 }, async () => {
      attempts++;
      throw new Error(`boom #${attempts}`);
    });

    await adapter.send("flaky", { n: 1 }, { retryLimit: 2 });

    // Wait for the job to exhaust retries and land in _honker_dead.
    await new Promise<void>((resolve) => {
      const t = setInterval(async () => {
        const failed = await adapter.getFailedJobs(10);
        if (failed.length > 0) {
          clearInterval(t);
          resolve();
        }
      }, 200);
      setTimeout(() => {
        clearInterval(t);
        resolve();
      }, 8000);
    });

    const failed = await adapter.getFailedJobs(10);
    expect(failed.length).toBeGreaterThanOrEqual(1);
    expect(failed[0].state).toBe("failed");
    expect(failed[0].deadletter).toContain("boom");
  });

  it("getQueueStats reports created and failed counts", async () => {
    await adapter.start();
    // Enqueue a job with a future run_at so it stays pending.
    await adapter.send("stats-q", { x: 1 }, { delaySeconds: 3600 });
    const stats = await adapter.getQueueStats();
    expect(stats.created).toBeGreaterThanOrEqual(1);
    // All known states present.
    for (const k of ["created", "active", "completed", "failed", "expired", "cancelled", "retry"]) {
      expect(stats).toHaveProperty(k);
    }
  });

  it("schedules and lists a recurring job", async () => {
    await adapter.start();
    await adapter.schedule("daily-summary", { kind: "tick" }, "@every 1h");
    const schedules = await adapter.getSchedules();
    const found = schedules.find((s) => s.name === "daily-summary");
    expect(found).toBeTruthy();
    expect(found?.cron).toBe("@every 1h");
    await adapter.unschedule("daily-summary");
  });

  it("getAvailableQueues only returns queues with live rows (adapter-level)", async () => {
    // This documents the honker adapter limitation that motivated the
    // queries.ts union with registered handlers: honker has no queue registry,
    // so getAvailableQueues() can only see queues that currently have rows in
    // _honker_live. A queue that was only createQueue'd (never enqueued to)
    // does NOT appear.
    await adapter.start();
    await adapter.createQueue("never-used");
    const before = await adapter.getAvailableQueues();
    expect(before).not.toContain("never-used");

    // Once a job is enqueued, the queue appears.
    await adapter.send("has-jobs", { x: 1 }, { delaySeconds: 3600 });
    const queues = await adapter.getAvailableQueues();
    expect(queues).toContain("has-jobs");
    expect(queues).not.toContain("never-used");
  });

  it("completed jobs remain visible after ack (matches pg-boss behavior)", async () => {
    // Regression: honker's job.ack() DELETEs the row, making completed jobs
    // invisible. The adapter now marks state='done' in-place instead so the
    // dashboard can list them — same as pg-boss.
    let resolveWork!: () => void;
    const workDone = new Promise<void>((r) => (resolveWork = r));

    await adapter.start();
    await adapter.createQueue("succeed-q");
    await adapter.work("succeed-q", { pollingIntervalSeconds: 1, batchSize: 1 }, async () => {
      resolveWork();
    });

    const jobId = await adapter.send("succeed-q", { msg: "done" });
    await workDone;

    // Give the UPDATE a tick to land.
    await new Promise((r) => setTimeout(r, 200));

    // The job should be queryable as completed.
    const { jobs, total } = await adapter.getJobsByState("completed", 10, 0);
    expect(total).toBeGreaterThanOrEqual(1);
    const found = jobs.find((j) => j.id === jobId);
    expect(found).toBeTruthy();
    expect(found?.state).toBe("completed");
    expect(found?.completedon).toBeTruthy();
  });
});
