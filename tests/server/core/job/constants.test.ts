import { describe, it, expect } from "vite-plus/test";
import { getJobStateDescription, isValidJobState, JOB_STATES } from "@/core/job/constants";

describe("job state helpers", () => {
  it("validates known states", () => {
    expect(isValidJobState(JOB_STATES.ACTIVE)).toBe(true);
    expect(isValidJobState("unknown-state")).toBe(false);
  });

  it("returns helpful descriptions", () => {
    expect(getJobStateDescription(JOB_STATES.FAILED)).toContain("failed");
    expect(getJobStateDescription("mystery")).toBe("Unknown job state");
  });
});
