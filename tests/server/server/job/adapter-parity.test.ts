/**
 * Cross-engine adapter parity test.
 *
 * The whole point of {@link JobQueueAdapter} is that engine-agnostic code
 * (handlers, the dashboard, queries.ts) never branches on SQLite vs Postgres.
 * This suite proves that contract by driving the *active* adapter — selected
 * by DATABASE_ENGINE exactly as in production — through the normalized
 * surface and asserting the same observable behavior either engine must
 * provide:
 *
 *   - send() returns a string id; getJobById() round-trips name + data
 *   - the normalized QueueJob has every dashboard field populated
 *   - schedule()/getSchedules()/unschedule() round-trip
 *   - purgeJobsByState() empties a state
 *
 * It runs on BOTH engines (no describe.skip), so `pnpm test:all` proves the
 * two adapters agree. The honker/pg-boss-specific suites cover engine-only
 * paths (retries, dead-letter, raw SQL); this one is the engine-agnostic
 * contract.
 */
import { describe, it, expect, beforeAll, afterAll } from "vite-plus/test";
import { initJobQueue, stopJobQueue, getJobQueue } from "@groot/jobs/server/client";
import { dbEngine } from "@groot/core/database/engine";

// A unique queue name so this test's rows never collide with the engine-
// specific suites (which also write to the shared test DB).
const Q = `parity-${dbEngine}`;

// Assert a value is one of a fixed set (nullable dashboard fields). Replaces
// the missing `expect.toBeOneOf` matcher.
const oneOf = <T>(actual: unknown, options: readonly T[]) => expect(options).toContainEqual(actual);

// Nullable-or-string fields share the same allowed set across engines.
const NULLABLE_STRING = [null, expect.any(String)] as const;

describe("JobQueueAdapter (cross-engine parity)", () => {
  // The adapter is started once for the whole file; getJobQueue() then returns
  // the singleton. Stopping per-test would re-run pg-boss schema setup.
  beforeAll(async () => {
    await initJobQueue();
    const queue = getJobQueue();
    // Create the queue up front. On Postgres this persists the queue def
    // (required before send/work); on SQLite it's a no-op (implicit create).
    await queue.createQueue(Q);
  });

  afterAll(async () => {
    await stopJobQueue();
  });

  it("send() returns a string id and the job round-trips through getJobById()", async () => {
    const queue = getJobQueue();
    const id = await queue.send(Q, { hello: "world" }, { delaySeconds: 3600 });

    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);

    const job = await queue.getJobById(Q, id);
    expect(job).not.toBeNull();
    expect(job!.id).toBe(id);
    expect(job!.name).toBe(Q);
    expect(job!.data).toEqual({ hello: "world" });
  });

  it("getJobById() returns null for a valid-shaped but non-existent job id", async () => {
    const queue = getJobQueue();
    // Use an id with the right shape for the active engine. Honker ids are
    // integers; pg-boss ids are UUIDs. A well-typed-but-absent id must resolve
    // to null on both engines — the "not found" contract the dashboard relies
    // on (an out-of-range integer for honker, a random UUID for pg-boss).
    const missingId = dbEngine === "sqlite" ? "999999999" : "00000000-0000-0000-0000-000000000000";
    const job = await queue.getJobById(Q, missingId);
    expect(job).toBeNull();
  });

  it("getJobById() returns a fully-normalized QueueJob (every dashboard field set)", async () => {
    const queue = getJobQueue();
    const id = await queue.send(Q, { k: 1 }, { delaySeconds: 3600 });
    const job = (await queue.getJobById(Q, id))!;

    // Every field the client `Job` type renders must be present and correctly
    // typed, regardless of engine. This is the shape parity guarantee. Non-
    // nullable fields are checked via objectContaining; nullable fields are
    // checked individually (they may be null OR a string/object).
    expect(job).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        data: expect.any(Object),
        state: expect.any(String),
        priority: expect.any(Number),
        retrylimit: expect.any(Number),
        retrycount: expect.any(Number),
        retrydelay: expect.any(Number),
        retrybackoff: expect.any(Boolean),
        startafter: expect.any(String),
        expirein: expect.any(String),
        createdon: expect.any(String),
        keepuntil: expect.any(String),
      }),
    );
    // Nullable fields: each is either null or a string (output: null or object).
    oneOf(job.startedon, NULLABLE_STRING);
    oneOf(job.completedon, NULLABLE_STRING);
    oneOf(job.singletonkey, NULLABLE_STRING);
    oneOf(job.singletonon, NULLABLE_STRING);
    oneOf(job.deadletter, NULLABLE_STRING);
    expect(job.output === null || typeof job.output === "object").toBe(true);
  });

  it("schedule() / getSchedules() / unschedule() round-trip", async () => {
    const queue = getJobQueue();
    const name = `${Q}-recurring`;
    // Postgres requires the queue to exist before scheduling; SQLite doesn't.
    // createQueue is idempotent across engines, so call it unconditionally.
    await queue.createQueue(name);

    await queue.schedule(name, { tick: true }, "0 2 * * *");
    const listed = await queue.getSchedules();
    const found = listed.find((s) => s.name === name);
    expect(found).toBeDefined();
    expect(found!.cron).toBe("0 2 * * *");

    await queue.unschedule(name);
    const after = await queue.getSchedules();
    expect(after.find((s) => s.name === name)).toBeUndefined();
  });

  it("getQueueStats() returns a count for every dashboard state", async () => {
    const queue = getJobQueue();

    const stats = await queue.getQueueStats();
    // Both adapters pre-seed the full VALID_JOB_STATES set to 0, so the
    // dashboard always renders every state column even when empty. Assert the
    // shape — not a non-zero count: a concurrent purge (the pgboss-adapter
    // suite's beforeEach purges globally on the shared test DB) can zero
    // `created` between a seed and this read. The "send produces a created
    // job" contract is covered by the getJobById round-trip above.
    for (const state of [
      "created",
      "active",
      "completed",
      "cancelled",
      "failed",
      "expired",
      "retry",
    ]) {
      expect(stats).toHaveProperty(state);
      expect(typeof stats[state]).toBe("number");
      expect(stats[state]).toBeGreaterThanOrEqual(0);
    }
  });

  it("deleteJob() removes the job so getJobById() returns null", async () => {
    const queue = getJobQueue();
    const id = await queue.send(Q, { bye: true }, { delaySeconds: 3600 });

    const deleted = await queue.deleteJob(Q, id);
    expect(deleted).toBe(true);
    expect(await queue.getJobById(Q, id)).toBeNull();
  });

  it("purgeJobsByState() empties the state and returns the deleted count", async () => {
    const queue = getJobQueue();
    // Seed a created job on our own queue.
    await queue.send(Q, { p: 1 }, { delaySeconds: 3600 });

    const n = await queue.purgeJobsByState("created");
    // purge returns the count of rows removed (an int >= 0). We don't assert a
    // lower bound on it: a concurrent purge from the pgboss-adapter suite
    // (global on this shared DB) can claim our row first. The deterministic
    // contract is the post-condition — the state is empty afterward.
    expect(typeof n).toBe("number");
    expect(n).toBeGreaterThanOrEqual(0);

    const after = await queue.getJobsByState("created", 50, 0);
    expect(after.total).toBe(0);
  });
});
