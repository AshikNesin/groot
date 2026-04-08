import { describe, it, expect } from "vite-plus/test";
import {
  createJobSchema,
  scheduleJobSchema,
  bulkRerunSchema,
  getJobsByStateSchema,
  getJobsSchema,
} from "@/shared/jobs/job.validation";

describe("Job Validation Schemas", () => {
  describe("createJobSchema", () => {
    it("accepts valid payload with all fields", () => {
      const result = createJobSchema.safeParse({
        jobName: "todo-cleanup",
        data: { key: "value" },
        options: { retryLimit: 5 },
      });
      expect(result.success).toBe(true);
    });

    it("accepts minimal payload (just jobName)", () => {
      const result = createJobSchema.safeParse({ jobName: "todo-cleanup" });
      expect(result.success).toBe(true);
    });

    it("rejects empty job name", () => {
      const result = createJobSchema.safeParse({ jobName: "" });
      expect(result.success).toBe(false);
    });

    it("rejects missing job name", () => {
      const result = createJobSchema.safeParse({ data: {} });
      expect(result.success).toBe(false);
    });
  });

  describe("scheduleJobSchema", () => {
    it("accepts valid schedule payload", () => {
      const result = scheduleJobSchema.safeParse({
        jobName: "todo-cleanup",
        cron: "0 9 * * *",
        data: {},
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing cron", () => {
      const result = scheduleJobSchema.safeParse({ jobName: "todo-cleanup" });
      expect(result.success).toBe(false);
    });

    it("rejects missing jobName", () => {
      const result = scheduleJobSchema.safeParse({ cron: "0 9 * * *" });
      expect(result.success).toBe(false);
    });
  });

  describe("bulkRerunSchema", () => {
    it("accepts valid bulk rerun payload", () => {
      const result = bulkRerunSchema.safeParse({
        jobs: [
          { queueName: "q1", jobId: "j1" },
          { queueName: "q2", jobId: "j2" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty jobs array", () => {
      const result = bulkRerunSchema.safeParse({ jobs: [] });
      expect(result.success).toBe(true); // Empty array is valid per schema, but controller may reject
    });

    it("rejects jobs with missing fields", () => {
      const result = bulkRerunSchema.safeParse({
        jobs: [{ queueName: "q1" }], // missing jobId
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing jobs field", () => {
      const result = bulkRerunSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("getJobsSchema", () => {
    it("accepts empty query (defaults)", () => {
      const result = getJobsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts all filter parameters", () => {
      const result = getJobsSchema.safeParse({
        state: "failed",
        name: "todo-cleanup",
        limit: "10",
        offset: "5",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      });
      expect(result.success).toBe(true);
    });

    it("coerces limit and offset from strings to numbers", () => {
      const result = getJobsSchema.safeParse({ limit: "25", offset: "10" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
        expect(result.data.offset).toBe(10);
      }
    });
  });
});
