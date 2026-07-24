import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

/**
 * worker.ts — handler registration + worker lifecycle orchestration.
 *
 * The worker module owns three responsibilities, each tested below:
 *   1. registration — handlers accumulate in an internal registry.
 *   2. start guards — empty registry (error + no-op) and double-start (warn).
 *   3. execution contract — createQueue() runs before work(); a delivered
 *      batch is processed sequentially; a handler throw propagates so the
 *      adapter can retry/dead-letter; a job logger is created per job.
 *
 * The worker module keeps module-level mutable state (a handler Map and a
 * `workersStarted` flag). To isolate every test, we reset modules and
 * dynamically re-import the worker for each case. `vi.hoisted` keeps stable
 * references to the adapter stubs across those re-imports.
 */

const stubs = vi.hoisted(() => {
  // capturedHandler holds the last handler closure handed to queue.work(),
  // so a test can drive it directly with a synthetic batch. A plain let
  // (not a vi.fn) avoids vi.clearAllMocks wiping it between cases.
  let capturedHandler: ((jobs: unknown[]) => Promise<void>) | null = null;
  return {
    capturedHandler: () => capturedHandler,
    resetCaptured: () => {
      capturedHandler = null;
    },
    createQueue: vi.fn(async () => undefined),
    work: vi.fn(async (_name: string, _opts: unknown, handler: (j: unknown[]) => Promise<void>) => {
      capturedHandler = handler;
      return undefined;
    }),
    offWork: vi.fn(async () => undefined),
    createJobLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), debug: vi.fn() })),
    sentry: { captureException: vi.fn() },
  };
});

vi.mock("@groot/jobs/server/client", () => ({
  getJobQueue: () => ({
    createQueue: stubs.createQueue,
    work: stubs.work,
    offWork: stubs.offWork,
  }),
}));

vi.mock("@groot/jobs/server/logger", () => ({
  createJobLogger: stubs.createJobLogger,
}));

vi.mock("@groot/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@groot/core/instrument", () => ({ Sentry: stubs.sentry }));

// Each test gets a fresh worker module (empty registry, workersStarted=false).
async function loadWorker() {
  vi.resetModules();
  return await import("@groot/jobs/server/worker");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("worker lifecycle", () => {
  describe("registerJobHandler / getRegisteredHandlers", () => {
    it("registers handlers that show up in getRegisteredHandlers", async () => {
      const { registerJobHandler, getRegisteredHandlers } = await loadWorker();
      registerJobHandler("a", vi.fn());
      registerJobHandler("b", vi.fn());

      expect(getRegisteredHandlers()).toEqual(expect.arrayContaining(["a", "b"]));
    });

    it("a later registration for the same name replaces the earlier handler", async () => {
      const { registerJobHandler, getRegisteredHandlers } = await loadWorker();
      registerJobHandler("dup", vi.fn());
      registerJobHandler("dup", vi.fn());

      expect(getRegisteredHandlers().filter((n) => n === "dup")).toHaveLength(1);
    });
  });

  describe("startWorkers guards", () => {
    it("does NOT start workers when no handlers are registered", async () => {
      // Fresh module => empty registry.
      const { startWorkers } = await loadWorker();
      await startWorkers();

      expect(stubs.createQueue).not.toHaveBeenCalled();
      expect(stubs.work).not.toHaveBeenCalled();
    });

    it("is a no-op when workers are already running (double-start)", async () => {
      const { registerJobHandler, startWorkers } = await loadWorker();
      registerJobHandler("once", vi.fn().mockResolvedValue(undefined));
      await startWorkers();
      const workCalls = stubs.work.mock.calls.length;

      await startWorkers();

      // Second start must not register workers again.
      expect(stubs.work.mock.calls.length).toBe(workCalls);
    });
  });

  describe("startWorkers execution contract", () => {
    it("creates the queue before registering a worker for it", async () => {
      const { registerJobHandler, startWorkers } = await loadWorker();
      registerJobHandler("q1", vi.fn().mockResolvedValue(undefined));
      await startWorkers();

      expect(stubs.createQueue).toHaveBeenCalledWith("q1");
      expect(stubs.work).toHaveBeenCalledWith(
        "q1",
        expect.objectContaining({
          pollingIntervalSeconds: expect.any(Number),
          batchSize: expect.any(Number),
        }),
        expect.any(Function),
      );
    });

    it("passes config polling/concurrency through as work options", async () => {
      const { registerJobHandler, startWorkers } = await loadWorker();
      registerJobHandler("opts", vi.fn().mockResolvedValue(undefined));
      await startWorkers();

      const opts = stubs.work.mock.calls[0][1] as {
        pollingIntervalSeconds: number;
        batchSize: number;
      };
      // jobConfig defaults: concurrency 5, pollIntervalSeconds 5.
      expect(opts.batchSize).toBe(5);
      expect(opts.pollingIntervalSeconds).toBe(5);
    });

    it("calls the registered handler with its JobContext and resolves on success", async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const { registerJobHandler, startWorkers } = await loadWorker();
      registerJobHandler("happy", handler);
      await startWorkers();

      const job = { id: "j1", name: "happy", data: { x: 1 } };
      await stubs.capturedHandler()!([job]);

      expect(handler).toHaveBeenCalledWith(job);
    });

    it("processes a delivered batch sequentially (one job at a time)", async () => {
      const order: string[] = [];
      const handler = vi.fn(async (job: { id: string }) => {
        order.push(`start:${job.id}`);
        await new Promise((r) => setTimeout(r, 5));
        order.push(`end:${job.id}`);
      });
      const { registerJobHandler, startWorkers } = await loadWorker();
      registerJobHandler("seq", handler);
      await startWorkers();

      await stubs.capturedHandler()!([
        { id: "1", name: "seq", data: {} },
        { id: "2", name: "seq", data: {} },
      ]);

      // Sequential => job 1 fully completes before job 2 starts.
      expect(order).toEqual(["start:1", "end:1", "start:2", "end:2"]);
    });

    it("propagates a handler throw so the adapter can retry/dead-letter", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("worker-boom"));
      const { registerJobHandler, startWorkers } = await loadWorker();
      registerJobHandler("boom", handler);
      await startWorkers();

      await expect(stubs.capturedHandler()!([{ id: "x", name: "boom", data: {} }])).rejects.toThrow(
        "worker-boom",
      );
    });

    it("creates a job logger per delivered job, keyed by job id", async () => {
      const { registerJobHandler, startWorkers } = await loadWorker();
      registerJobHandler("logged", vi.fn().mockResolvedValue(undefined));
      await startWorkers();

      await stubs.capturedHandler()!([
        { id: "a", name: "logged", data: {} },
        { id: "b", name: "logged", data: {} },
      ]);

      const jobIds = stubs.createJobLogger.mock.calls.map((c) => c[0].jobId);
      expect(jobIds).toEqual(["a", "b"]);
    });

    it("starts workers for every registered handler", async () => {
      const { registerJobHandler, startWorkers } = await loadWorker();
      registerJobHandler("one", vi.fn().mockResolvedValue(undefined));
      registerJobHandler("two", vi.fn().mockResolvedValue(undefined));
      await startWorkers();

      expect(stubs.createQueue).toHaveBeenCalledWith("one");
      expect(stubs.createQueue).toHaveBeenCalledWith("two");
      // Two distinct work() registrations, one per handler.
      const names = stubs.work.mock.calls.map((c) => c[0]);
      expect(names).toEqual(expect.arrayContaining(["one", "two"]));
    });
  });

  describe("stopWorkers", () => {
    it("calls offWork for each registered handler and is a no-op when not running", async () => {
      const { registerJobHandler, startWorkers, stopWorkers } = await loadWorker();
      registerJobHandler("s1", vi.fn().mockResolvedValue(undefined));
      await startWorkers();

      await stopWorkers();
      expect(stubs.offWork).toHaveBeenCalledWith("s1");

      // Second stop is a no-op (workers already stopped).
      const offCalls = stubs.offWork.mock.calls.length;
      await stopWorkers();
      expect(stubs.offWork.mock.calls.length).toBe(offCalls);
    });
  });
});
