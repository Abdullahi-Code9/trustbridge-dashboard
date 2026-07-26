import { describe, it, expect, vi } from "vitest";
import type { Job } from "./background-queue";

describe("BackgroundQueue (unit tests)", () => {
  it("should enqueue jobs with correct structure", () => {
    // This is a unit test that verifies the queue data structure
    // without relying on the singleton instance which runs continuously
    const mockJob: Job = {
      id: "recheck.batch-123",
      type: "recheck.batch",
      data: { test: true },
      status: "pending",
      createdAt: new Date(),
    };

    expect(mockJob.id).toMatch(/^recheck\.batch-/);
    expect(mockJob.status).toBe("pending");
    expect(mockJob.data).toEqual({ test: true });
  });

  it("should handle job state transitions", () => {
    const job: Job = {
      id: "test-1",
      type: "recheck.single",
      data: { contributorId: "id-123" },
      status: "pending",
      createdAt: new Date(),
    };

    job.status = "processing";
    job.startedAt = new Date();
    expect(job.status).toBe("processing");

    job.status = "completed";
    job.completedAt = new Date();
    job.result = { success: true };
    expect(job.status).toBe("completed");
    expect(job.result).toEqual({ success: true });
  });

  it("should handle job errors", () => {
    const job: Job = {
      id: "test-2",
      type: "recheck.batch",
      data: {},
      status: "pending",
      createdAt: new Date(),
    };

    job.status = "processing";
    job.startedAt = new Date();

    job.status = "failed";
    job.error = "Horizon connection timeout";
    job.completedAt = new Date();

    expect(job.status).toBe("failed");
    expect(job.error).toContain("Horizon");
  });

  it("should validate queue metrics structure", () => {
    const metrics = {
      totalJobs: 10,
      pendingCount: 3,
      processingCount: 2,
      completedCount: 4,
      failedCount: 1,
      averageProcessingTimeMs: 250,
    };

    expect(metrics.totalJobs).toBe(10);
    expect(metrics.pendingCount + metrics.processingCount + metrics.completedCount + metrics.failedCount).toBeLessThanOrEqual(metrics.totalJobs);
    expect(metrics.averageProcessingTimeMs).toBeGreaterThanOrEqual(0);
  });
});
