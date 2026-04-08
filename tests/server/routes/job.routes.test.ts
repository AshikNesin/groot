import express from "express";
import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vite-plus/test";

/**
 * Job API Route Tests — Validation Layer
 *
 * These tests exercise the Zod validation middleware that guards each route.
 * They verify that invalid payloads are rejected (400) and valid payloads
 * pass through to the controller.
 *
 * The controller → JobSystem integration is tested at the unit level
 * (error-handler.test.ts, todo.jobs.test.ts) and through e2e tests.
 * Transitive mocking of `@/core/job` doesn't work in this vitest environment,
 * so we test the validation boundary here — the most common source of bugs.
 *
 * NOTE: Routes that pass validation return 500 because JobSystem isn't mocked.
 * This is expected — the test focuses on 400 vs non-400 status codes.
 */

import jobRouter from "@/shared/jobs/job.routes";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/jobs", jobRouter);
  return app;
};

describe("Job API — Validation", () => {
  describe("POST /jobs", () => {
    it("rejects empty job name", async () => {
      const res = await request(buildApp()).post("/jobs").send({ jobName: "", data: {} });
      expect(res.status).toBe(400);
    });

    it("rejects missing body", async () => {
      const res = await request(buildApp()).post("/jobs").send({});
      expect(res.status).toBe(400);
    });

    it("accepts valid payload (passes validation → 500 from unmocked JobSystem)", async () => {
      const res = await request(buildApp())
        .post("/jobs")
        .send({ jobName: "todo-cleanup", data: { demo: true } });
      // Not 400 = validation passed
      expect(res.status).not.toBe(400);
    });

    it("accepts payload without data (optional field)", async () => {
      const res = await request(buildApp()).post("/jobs").send({ jobName: "todo-cleanup" });
      expect(res.status).not.toBe(400);
    });

    it("accepts payload with options", async () => {
      const res = await request(buildApp())
        .post("/jobs")
        .send({ jobName: "todo-cleanup", data: {}, options: { retryLimit: 5 } });
      expect(res.status).not.toBe(400);
    });
  });

  describe("POST /jobs/schedule", () => {
    it("rejects missing cron expression", async () => {
      const res = await request(buildApp())
        .post("/jobs/schedule")
        .send({ jobName: "todo-cleanup" });
      expect(res.status).toBe(400);
    });

    it("rejects missing jobName", async () => {
      const res = await request(buildApp()).post("/jobs/schedule").send({ cron: "0 9 * * *" });
      expect(res.status).toBe(400);
    });

    it("accepts valid schedule payload", async () => {
      const res = await request(buildApp())
        .post("/jobs/schedule")
        .send({ jobName: "todo-cleanup", cron: "0 9 * * *", data: {} });
      expect(res.status).not.toBe(400);
    });
  });

  describe("POST /jobs/bulk-rerun", () => {
    it("rejects missing jobs field", async () => {
      const res = await request(buildApp()).post("/jobs/bulk-rerun").send({});
      expect(res.status).toBe(400);
    });

    it("rejects jobs with missing fields", async () => {
      const res = await request(buildApp())
        .post("/jobs/bulk-rerun")
        .send({ jobs: [{ queueName: "q1" }] }); // missing jobId
      expect(res.status).toBe(400);
    });

    it("accepts valid bulk rerun payload", async () => {
      const res = await request(buildApp())
        .post("/jobs/bulk-rerun")
        .send({ jobs: [{ queueName: "q1", jobId: "j1" }] });
      expect(res.status).not.toBe(400);
    });
  });

  describe("GET /jobs", () => {
    it("accepts default query (no params)", async () => {
      const res = await request(buildApp()).get("/jobs");
      expect(res.status).not.toBe(400);
    });

    it("accepts filter parameters", async () => {
      const res = await request(buildApp()).get(
        "/jobs?state=failed&name=todo-cleanup&limit=10&offset=0",
      );
      expect(res.status).not.toBe(400);
    });

    it("accepts date range parameters", async () => {
      const res = await request(buildApp()).get("/jobs?startDate=2025-01-01&endDate=2025-12-31");
      expect(res.status).not.toBe(400);
    });
  });

  describe("GET /jobs/state/:state", () => {
    it("accepts valid state parameter", async () => {
      const res = await request(buildApp()).get("/jobs/state/failed");
      expect(res.status).not.toBe(400);
    });

    it("accepts limit and offset", async () => {
      const res = await request(buildApp()).get("/jobs/state/completed?limit=10&offset=5");
      expect(res.status).not.toBe(400);
    });
  });
});
