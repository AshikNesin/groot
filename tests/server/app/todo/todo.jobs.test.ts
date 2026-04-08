import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import type { Job } from "pg-boss";

const deleteManyMock = vi.fn().mockResolvedValue({ count: 0 });
const countMock = vi.fn().mockResolvedValue(0);
const registerJobHandlerMock = vi.fn();

// Capture registered handlers via the mock
const registeredHandlers = new Map<string, Function>();
registerJobHandlerMock.mockImplementation((name: string, handler: Function) => {
  registeredHandlers.set(name, handler);
});

vi.mock("../../../../server/src/core/database", () => ({
  prisma: {
    todo: {
      deleteMany: deleteManyMock,
      count: countMock,
    },
  },
}));

vi.mock("../../../../server/src/core/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
  createJobLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("../../../../server/src/core/job/worker", () => ({
  registerJobHandler: registerJobHandlerMock,
}));

describe("Todo Jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandlers.clear();
  });

  it("registers both cleanup and summary handlers on registerTodoJobs()", async () => {
    const { registerTodoJobs } = await import("@/app/todo/todo.jobs");
    registerTodoJobs();

    expect(registerJobHandlerMock).toHaveBeenCalledWith("todo-cleanup", expect.any(Function));
    expect(registerJobHandlerMock).toHaveBeenCalledWith("todo-summary", expect.any(Function));
  });

  describe("todo-cleanup handler", () => {
    it("deletes completed todos older than cutoff", async () => {
      const { registerTodoJobs } = await import("@/app/todo/todo.jobs");
      registerTodoJobs();

      const handler = registeredHandlers.get("todo-cleanup")!;

      deleteManyMock.mockResolvedValueOnce({ count: 5 });

      const job = { id: "cleanup-1", data: { daysToKeep: 14 } } as Job<{ daysToKeep?: number }>;
      await handler(job);

      expect(deleteManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ completed: true }),
        }),
      );
    });

    it("defaults to 30 days when daysToKeep is not provided", async () => {
      const { registerTodoJobs } = await import("@/app/todo/todo.jobs");
      registerTodoJobs();

      const handler = registeredHandlers.get("todo-cleanup")!;

      deleteManyMock.mockResolvedValueOnce({ count: 0 });

      const job = { id: "cleanup-2", data: {} } as Job<{ daysToKeep?: number }>;
      await handler(job);

      const call = deleteManyMock.mock.calls[0][0] as any;
      const cutoffDate = call.where.updatedAt.lt as Date;
      const now = new Date();
      const diffDays = (now.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(29);
      expect(diffDays).toBeLessThan(31);
    });

    it("handles empty data gracefully", async () => {
      const { registerTodoJobs } = await import("@/app/todo/todo.jobs");
      registerTodoJobs();

      const handler = registeredHandlers.get("todo-cleanup")!;

      deleteManyMock.mockResolvedValueOnce({ count: 0 });

      const job = { id: "cleanup-3", data: undefined } as Job<{ daysToKeep?: number }>;
      await handler(job);
      expect(deleteManyMock).toHaveBeenCalled();
    });
  });

  describe("todo-summary handler", () => {
    it("queries total, completed, and pending counts", async () => {
      const { registerTodoJobs } = await import("@/app/todo/todo.jobs");
      registerTodoJobs();

      const handler = registeredHandlers.get("todo-summary")!;

      countMock
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7) // completed
        .mockResolvedValueOnce(3); // pending

      const job = { id: "summary-1", data: { includeCompleted: true } } as Job<{
        includeCompleted?: boolean;
      }>;
      await handler(job);

      expect(countMock).toHaveBeenCalledTimes(3);
    });

    it("works with default options", async () => {
      const { registerTodoJobs } = await import("@/app/todo/todo.jobs");
      registerTodoJobs();

      const handler = registeredHandlers.get("todo-summary")!;

      countMock.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const job = { id: "summary-2", data: {} } as Job<{ includeCompleted?: boolean }>;
      await handler(job);
      expect(countMock).toHaveBeenCalledTimes(3);
    });
  });
});
