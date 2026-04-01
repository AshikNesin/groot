import express from "express";
import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vite-plus/test";

const jobModuleMock = vi.hoisted(() => {
  return {
    addJob: vi.fn().mockResolvedValue("job-123"),
    scheduleJob: vi.fn().mockResolvedValue(undefined),
    cancelScheduledJob: vi.fn().mockResolvedValue(undefined),
    getScheduledJobs: vi.fn().mockResolvedValue([]),
    getJobById: vi.fn().mockResolvedValue({ id: "job-123", name: "todo-cleanup", data: {} }),
    getFailedJobs: vi.fn().mockResolvedValue([]),
    retryJob: vi.fn().mockResolvedValue(undefined),
    cancelJob: vi.fn().mockResolvedValue(undefined),
    resumeJob: vi.fn().mockResolvedValue(undefined),
    rerunJob: vi.fn().mockResolvedValue("job-456"),
    getQueueStats: vi.fn().mockResolvedValue({}),
    getJobsByState: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    getJobs: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    purgeJobsByState: vi.fn().mockResolvedValue(0),
    deleteJob: vi.fn().mockResolvedValue(undefined),
    JobName: { TODO_CLEANUP: "todo-cleanup" },
  };
});

vi.mock("@/core/job", () => jobModuleMock);

import jobRouter from "@/features/jobs/job.routes";
import * as jobModule from "@/core/job";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(jobRouter);
  return app;
};

describe("job routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queues a job when payload is valid", async () => {
    const response = await request(buildApp())
      .post("/")
      .send({ jobName: jobModule.JobName.TODO_CLEANUP, data: { demo: true } });

    expect(response.status).toBe(201);
    expect(jobModuleMock.addJob).toHaveBeenCalledWith(
      jobModule.JobName.TODO_CLEANUP,
      { demo: true },
      undefined,
    );
  });

  it("rejects invalid job names", async () => {
    const response = await request(buildApp()).post("/").send({ jobName: "invalid", data: {} });
    expect(response.status).toBe(400);
    expect(jobModuleMock.addJob).not.toHaveBeenCalled();
  });

  it("retries a job via API", async () => {
    const response = await request(buildApp()).post("/todo-cleanup/abc/retry").send();
    expect(response.status).toBe(200);
    expect(jobModuleMock.retryJob).toHaveBeenCalledWith("todo-cleanup", "abc");
  });

  it("responds with 404 when job is missing", async () => {
    jobModuleMock.getJobById.mockResolvedValueOnce(null);
    const response = await request(buildApp()).get("/todo-cleanup/missing");
    expect(response.status).toBe(404);
  });
});
