import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { withSentryErrorCapture } from "@/core/job/error-handler";
import type { Job } from "pg-boss";

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(),
}));

vi.mock("../../../../server/src/core/instrument", () => ({
  Sentry: sentryMock,
}));

vi.mock("../../../../server/src/core/logger", () => ({
  logger: { error: vi.fn() },
  createJobLogger: () => ({ error: vi.fn(), info: vi.fn() }),
}));

describe("withSentryErrorCapture", () => {
  const mockJob = { id: "job-123", data: { foo: "bar" } } as Job<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call the original handler when it succeeds", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const wrapped = withSentryErrorCapture(handler, "test-job");

    await wrapped(mockJob);
    expect(handler).toHaveBeenCalledWith(mockJob);
  });

  it("should re-throw and capture error in Sentry when handler fails", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("Job failed"));
    const wrapped = withSentryErrorCapture(handler, "test-job");

    await expect(wrapped(mockJob)).rejects.toThrow("Job failed");

    expect(sentryMock.captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { component: "job_queue", jobName: "test-job" },
      extra: { jobId: "job-123" },
    });
  });

  it("should handle non-Error thrown values by wrapping in Error", async () => {
    const handler = vi.fn().mockRejectedValue("string error");
    const wrapped = withSentryErrorCapture(handler, "test-job");

    await expect(wrapped(mockJob)).rejects.toThrow("string error");
    expect(sentryMock.captureException).toHaveBeenCalled();
  });
});
