/**
 * PgBossAdapter — the PostgreSQL job queue implementation.
 *
 * This is the Postgres counterpart of honker-adapter.test.ts. It exercises the
 * adapter against a real Postgres instance: enqueue → createQueue → work →
 * ack/retry/dead-letter, plus the cross-queue dashboard queries (getQueueStats,
 * getJobs, getJobsByState, purgeJobsByState) that are only reachable via the
 * raw-SQL paths in pgboss-adapter.ts. Skipped on SQLite — pg-boss needs
 * Postgres, and constructing PgBossAdapter without one throws at start().
 */
import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { PgBossAdapter } from "@groot/jobs/server/pgboss-adapter";
import type { JobContext } from "@groot/jobs/server/adapter";
import { isPostgres } from "@groot/core/database/engine";

// runIfPostgres mirrors the honker pattern: skip the whole suite on SQLite so
// `pnpm test:sqlite` stays green without a running Postgres.
const runIfPostgres = isPostgres ? describe : describe.skip;

// Wait until at least one job matching `predicate` shows up, polling the
// adapter. Mirrors the honker test's poll loop — pg-boss retries/maintenance
// are async, so a fixed sleep would be flaky.
async function waitFor<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  { timeoutMs = 8000, intervalMs = 200 } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: T;
  do {
    last = await fn();
    if (predicate(last)) return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  } while (Date.now() < deadline);
  return last!;
}

runIfPostgres("PgBossAdapter (PostgreSQL job queue)", () => {
  let adapter: PgBossAdapter;
  // Unique queue name per file (not per test) — pg-boss persists queue
  // definitions in pgboss.queue, and we purge our queue in beforeEach.
  const Q = "pgboss-adapter-test";

  beforeEach(async () => {
    adapter = new PgBossAdapter();
    await adapter.start();
    await adapter.createQueue(Q);
    // Clear jobs in EVERY state left from a prior run, so counts are
    // deterministic and a stale 'active'/'retry' row from a timed-out test
    // can't leak into the next test's worker. adapter.stop() in afterEach
    // tears down workers; this guarantees a clean table on the way in.
    //
    // NOTE: pg-boss's job_state enum has 6 values (no "expired" — that's a
    // honker-only concept). Purging "expired" would throw an enum cast error,
    // so we enumerate exactly the states pg-boss knows about here.
    await Promise.all(
      ["created", "retry", "active", "completed", "cancelled", "failed"].map((s) =>
        adapter.purgeJobsByState(s),
      ),
    );
  });

  afterEach(async () => {
    await adapter.stop();
  });

  it("enqueues a job and a worker receives and acks it", async () => {
    const received: JobContext[] = [];
    // Don't block on the worker callback firing — pg-boss's worker wakeup
    // (NOTIFY when the built-in connection is used, else polling) is timing-
    // dependent and missed NOTIFies can delay the first pickup past a fixed
    // timeout. Instead, capture the delivered job and then poll for the
    // observable outcome: the job reaching the terminal `completed` state.
    // Same resilient pattern as the retry test below.
    await adapter.work(Q, { pollingIntervalSeconds: 1, batchSize: 1 }, async (jobs) => {
      received.push(...jobs);
    });

    const jobId = await adapter.send(Q, { msg: "hello" });
    expect(typeof jobId).toBe("string");

    await waitFor(
      async () => adapter.getJobById(Q, jobId!),
      (job) => job?.state === "completed",
      { timeoutMs: 15000 },
    );

    expect(received).toHaveLength(1);
    expect(received[0].name).toBe(Q);
    expect(received[0].data).toEqual({ msg: "hello" });

    await adapter.offWork(Q);
  }, 30000);

  it("retries a failing job then marks it failed after retries exhaust", async () => {
    let attempts = 0;
    await adapter.work(Q, { pollingIntervalSeconds: 1, batchSize: 1 }, async () => {
      attempts++;
      throw new Error(`boom #${attempts}`);
    });

    await adapter.send(Q, { n: 1 }, { retryLimit: 2, retryDelay: 1, retryBackoff: false });

    // Wait for the job to land in the terminal `failed` state after retries
    // exhaust. Retries are driven by pg-boss's maintenance loop, which lags
    // the worker poll, so allow a generous margin (2 attempts × ~1s retryDelay
    // + maintenance slack).
    //
    // Assert directly on the waitFor result instead of re-querying afterward:
    // pg-boss's archive/maintenance (deleteAfterSeconds/retentionSeconds
    // defaults) can remove a failed row between two sequential queries, so a
    // follow-up getFailedJobs() raced empty in CI even though the job had
    // reached `failed`. waitFor returns the {jobs,total} that satisfied the
    // predicate, so we assert on that snapshot.
    const failed = await waitFor(
      () => adapter.getJobsByState("failed", 10, 0),
      (r) => r.total >= 1,
      { timeoutMs: 25000 },
    );

    expect(failed.jobs.length).toBeGreaterThanOrEqual(1);
    expect(failed.jobs[0].state).toBe("failed");

    await adapter.offWork(Q);
  }, 30000);

  it("getQueueStats reports counts for each known state", async () => {
    // Enqueue a job with a delay so it stays in 'created' for the assertion.
    await adapter.send(Q, { x: 1 }, { delaySeconds: 3600 });
    const stats = await adapter.getQueueStats();
    expect(stats.created).toBeGreaterThanOrEqual(1);
    // Every dashboard state key is present (the adapter pre-seeds them to 0).
    for (const k of ["created", "active", "completed", "failed", "expired", "cancelled", "retry"]) {
      expect(stats).toHaveProperty(k);
    }
  });

  it("schedules, lists, and unschedules a recurring job", async () => {
    const name = `${Q}-sched`;
    // pg-boss v12 requires the target queue to exist before scheduling.
    await adapter.createQueue(name);
    await adapter.schedule(name, { kind: "tick" }, "0 2 * * *");
    let schedules = await adapter.getSchedules();
    expect(schedules.find((s) => s.name === name)).toBeTruthy();

    await adapter.unschedule(name);
    schedules = await adapter.getSchedules();
    expect(schedules.find((s) => s.name === name)).toBeUndefined();
  });

  it("getAvailableQueues excludes internal __pgboss__ queues", async () => {
    const queues = await adapter.getAvailableQueues();
    // Internal maintenance queues must never leak into the dashboard dropdown.
    expect(queues.every((q) => !q.startsWith("__pgboss__"))).toBe(true);
    expect(queues).toContain(Q);
  });

  it("getJobById returns the normalized job, or null when absent", async () => {
    const id = await adapter.send(Q, { a: 1 }, { delaySeconds: 3600 });
    const job = await adapter.getJobById(Q, id!);
    expect(job).not.toBeNull();
    expect(job!.id).toBe(id);
    expect(job!.name).toBe(Q);
    expect(job!.data).toEqual({ a: 1 });

    const missing = await adapter.getJobById(Q, "00000000-0000-0000-0000-000000000000");
    expect(missing).toBeNull();
  });

  it("getJobs filters by name and paginates", async () => {
    // A couple of delayed jobs so they remain queryable in 'created'.
    await adapter.send(Q, { i: 1 }, { delaySeconds: 3600 });
    await adapter.send(Q, { i: 2 }, { delaySeconds: 3600 });

    const page1 = await adapter.getJobs({ name: Q, limit: 1, offset: 0 });
    expect(page1.jobs).toHaveLength(1);
    expect(page1.total).toBeGreaterThanOrEqual(2);

    const page2 = await adapter.getJobs({ name: Q, limit: 1, offset: 1 });
    expect(page2.jobs).toHaveLength(1);
    // Different offsets return different jobs (ids differ).
    expect(page2.jobs[0].id).not.toBe(page1.jobs[0].id);
  });

  it("cancel and resume move a created job through state transitions", async () => {
    const id = await adapter.send(Q, { x: 1 }, { delaySeconds: 3600 });

    const cancelled = await adapter.cancelJob(Q, id!);
    expect(cancelled).toBe(true);
    let job = await adapter.getJobById(Q, id!);
    expect(job!.state).toBe("cancelled");

    const resumed = await adapter.resumeJob(Q, id!);
    expect(resumed).toBe(true);
    job = await adapter.getJobById(Q, id!);
    expect(["created", "retry"]).toContain(job!.state);
  });

  it("deleteJob removes the job so it is no longer queryable", async () => {
    const id = await adapter.send(Q, { x: 1 }, { delaySeconds: 3600 });
    const deleted = await adapter.deleteJob(Q, id!);
    expect(deleted).toBe(true);
    expect(await adapter.getJobById(Q, id!)).toBeNull();
  });

  it("purgeJobsByState deletes jobs in the given state and returns the count", async () => {
    // Two cancelled jobs.
    const a = await adapter.send(Q, { x: 1 }, { delaySeconds: 3600 });
    const b = await adapter.send(Q, { x: 2 }, { delaySeconds: 3600 });
    await adapter.cancelJob(Q, a!);
    await adapter.cancelJob(Q, b!);

    const before = await adapter.getJobsByState("cancelled", 50, 0);
    expect(before.total).toBeGreaterThanOrEqual(2);

    const n = await adapter.purgeJobsByState("cancelled");
    expect(n).toBeGreaterThanOrEqual(2);

    const after = await adapter.getJobsByState("cancelled", 50, 0);
    expect(after.total).toBe(0);
  });
});
