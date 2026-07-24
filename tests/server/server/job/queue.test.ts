import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

/**
 * queue.ts — enqueue/scheduling/wrapper layer.
 *
 * This module is thin glue over {@link JobQueueAdapter}: it merges default job
 * options, maps adapter booleans into Boom errors, and aggregates bulk reruns.
 * Those mappings are the only logic here worth testing — the adapter itself is
 * covered by integration tests. We mock the adapter (via the `client` module)
 * and assert the glue behavior, including every error path.
 */

// Captured adapter method calls so assertions can inspect arguments.
const send = vi.fn();
const schedule = vi.fn();
const unschedule = vi.fn();
const deleteJob = vi.fn();
const retryJob = vi.fn();
const cancelJob = vi.fn();
const resumeJob = vi.fn();
const getJobById = vi.fn();

vi.mock("@groot/jobs/server/client", () => ({
  // Each call returns a fresh stub so test state never leaks between cases.
  getJobQueue: () => ({
    send,
    schedule,
    unschedule,
    deleteJob,
    retryJob,
    cancelJob,
    resumeJob,
    getJobById,
  }),
}));

// Logger is pure side-effect; stub it to keep test output clean.
vi.mock("@groot/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  addJob,
  scheduleJob,
  cancelScheduledJob,
  editScheduledJob,
  deleteJob as deleteJobQueue,
  retryJob as retryJobQueue,
  cancelJob as cancelJobQueue,
  resumeJob as resumeJobQueue,
  rerunJob,
  rerunJobs,
} from "@groot/jobs/server/queue";
import { Boom } from "@groot/core/errors";

describe("queue wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addJob", () => {
    it("merges default options with caller overrides and returns the job id", async () => {
      send.mockResolvedValue("job-1");

      const id = await addJob("todo-cleanup", { daysToKeep: 30 });

      expect(id).toBe("job-1");
      // defaultJobOptions (retryLimit 3, retryDelay 60, retryBackoff true,
      // expireInSeconds 12h) should be passed through to the adapter.
      const [, , opts] = send.mock.calls[0];
      expect(opts).toMatchObject({
        retryLimit: 3,
        retryDelay: 60,
        retryBackoff: true,
        expireInSeconds: 60 * 60 * 12,
      });
    });

    it("caller options override the defaults", async () => {
      send.mockResolvedValue("job-2");

      await addJob("x", {}, { retryLimit: 10, expireInSeconds: 5 });

      const opts = send.mock.calls[0][2];
      expect(opts.retryLimit).toBe(10);
      expect(opts.expireInSeconds).toBe(5);
      // Untouched defaults are preserved.
      expect(opts.retryBackoff).toBe(true);
    });

    it("forwards the name and data verbatim", async () => {
      send.mockResolvedValue("job-3");

      await addJob("echo", { msg: "hi" });

      const [name, data] = send.mock.calls[0];
      expect(name).toBe("echo");
      expect(data).toEqual({ msg: "hi" });
    });
  });

  describe("scheduling", () => {
    it("scheduleJob delegates name/data/cron/options to the adapter", async () => {
      schedule.mockResolvedValue(undefined);

      await scheduleJob("nightly", { x: 1 }, "0 2 * * *", { key: "singleton" });

      expect(schedule).toHaveBeenCalledWith("nightly", { x: 1 }, "0 2 * * *", { key: "singleton" });
    });

    it("cancelScheduledJob delegates name + key", async () => {
      unschedule.mockResolvedValue(undefined);

      await cancelScheduledJob("nightly", "singleton");

      expect(unschedule).toHaveBeenCalledWith("nightly", "singleton");
    });
  });

  describe("editScheduledJob", () => {
    it("requires a key and throws Boom.badRequest when missing", async () => {
      await expect(editScheduledJob("x", undefined, "0 * * * *", {})).rejects.toThrow(
        /Key is required/,
      );
      expect(unschedule).not.toHaveBeenCalled();
      expect(schedule).not.toHaveBeenCalled();
    });

    it("unschedules the old schedule then schedules the new one", async () => {
      unschedule.mockResolvedValue(undefined);
      schedule.mockResolvedValue(undefined);

      await editScheduledJob("nightly", "k1", "0 3 * * *", { x: 9 }, { key: "k2" });

      expect(unschedule).toHaveBeenCalledWith("nightly", "k1");
      expect(schedule).toHaveBeenCalledWith("nightly", { x: 9 }, "0 3 * * *", { key: "k2" });
    });
  });

  describe("deleteJob", () => {
    it("throws Boom.internal when the adapter reports deletion failed", async () => {
      deleteJob.mockResolvedValue(false);

      await expect(deleteJobQueue({ queueName: "q", jobId: "123" })).rejects.toThrow(
        /Failed to delete job: q\/123/,
      );
    });

    it("resolves when the adapter confirms deletion", async () => {
      deleteJob.mockResolvedValue(true);

      await expect(deleteJobQueue({ queueName: "q", jobId: "123" })).resolves.toBeUndefined();
      expect(deleteJob).toHaveBeenCalledWith("q", "123");
    });
  });

  // The retry/cancel/resume wrappers share an identical shape: delegate to the
  // adapter and throw Boom.internal on a falsy return. Parametrize to cover all
  // three without duplicating the assertion block.
  describe.each([
    ["retryJob", retryJobQueue, retryJob, "Retry failed"],
    ["cancelJob", cancelJobQueue, cancelJob, "Cancel failed"],
    ["resumeJob", resumeJobQueue, resumeJob, "Resume failed"],
  ] as const)("%s", (_label, wrapper, stub, failMsg) => {
    it("delegates queueName/jobId to the adapter", async () => {
      stub.mockResolvedValue(true);

      await wrapper({ queueName: "q", jobId: "9" });

      expect(stub).toHaveBeenCalledWith("q", "9");
    });

    it("throws Boom.internal when the adapter returns false", async () => {
      stub.mockResolvedValue(false);

      await expect(wrapper({ queueName: "q", jobId: "9" })).rejects.toThrow(failMsg);
    });
  });

  describe("rerunJob", () => {
    it("throws Boom.notFound when the source job does not exist", async () => {
      getJobById.mockResolvedValue(null);

      await expect(rerunJob({ queueName: "q", jobId: "ghost" })).rejects.toThrow(
        /Job not found: q\/ghost/,
      );
      expect(send).not.toHaveBeenCalled();
    });

    it("re-enqueues the source job's name + data and returns the new id", async () => {
      getJobById.mockResolvedValue({
        name: "todo-cleanup",
        data: { daysToKeep: 5 },
      });
      send.mockResolvedValue("new-id");

      const id = await rerunJob({ queueName: "q", jobId: "1" });

      expect(getJobById).toHaveBeenCalledWith("q", "1");
      expect(send).toHaveBeenCalledWith("todo-cleanup", { daysToKeep: 5 }, expect.any(Object));
      expect(id).toBe("new-id");
    });
  });

  describe("rerunJobs (bulk)", () => {
    it("reports success per job that re-enqueues, and failure otherwise", async () => {
      getJobById
        // job A: exists → send ok
        .mockResolvedValueOnce({ name: "a", data: {} })
        // job B: missing → Boom.notFound
        .mockResolvedValueOnce(null)
        // job C: exists → send ok
        .mockResolvedValueOnce({ name: "c", data: {} });
      send.mockResolvedValueOnce("id-a").mockResolvedValueOnce("id-c");

      const results = await rerunJobs([
        { queueName: "q", jobId: "1" },
        { queueName: "q", jobId: "2" },
        { queueName: "q", jobId: "3" },
      ]);

      expect(results).toEqual([
        { queueName: "q", jobId: "1", success: true, newJobId: "id-a" },
        {
          queueName: "q",
          jobId: "2",
          success: false,
          // Boom.notFound("Job not found: q/2")
          error: expect.stringMatching(/Job not found: q\/2/),
        },
        { queueName: "q", jobId: "3", success: true, newJobId: "id-c" },
      ]);
    });

    it("records a non-Error rejection reason as a string", async () => {
      // A rejection that isn't an Error instance — rerunJobs must still
      // stringify it for the `error` field rather than throwing.
      getJobById.mockRejectedValueOnce("boom-string");

      const [result] = await rerunJobs([{ queueName: "q", jobId: "1" }]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("boom-string");
    });

    it("returns an empty array for an empty input", async () => {
      const results = await rerunJobs([]);
      expect(results).toEqual([]);
    });
  });

  // Document the public contract of every wrapper error: they throw HttpError
  // (Boom) so the Express error middleware can translate to the right status.
  describe("error types are HttpError (Boom)", () => {
    it("deleteJob failure is a 500 HttpError", async () => {
      deleteJob.mockResolvedValue(false);
      await expect(deleteJobQueue({ queueName: "q", jobId: "1" })).rejects.toSatisfy(
        Boom.isHttpError,
      );
    });

    it("rerunJob not-found is a 404 HttpError", async () => {
      getJobById.mockResolvedValue(null);
      await expect(rerunJob({ queueName: "q", jobId: "1" })).rejects.toSatisfy(Boom.isHttpError);
    });

    it("editScheduledJob missing-key is a 400 HttpError", async () => {
      await expect(editScheduledJob("x", undefined, "0 * * * *", {})).rejects.toSatisfy(
        Boom.isHttpError,
      );
    });
  });
});
