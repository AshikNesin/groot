import { describe, it, expect, vi } from "vite-plus/test";

vi.mock("@groot/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
  createJobLogger: () => ({ info: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

describe("KV System", () => {
  describe("Namespaced KV", () => {
    it("should create a namespaced KV instance", async () => {
      const { createNamespaceKv } = await import("@groot/core/kv/store");
      const nsKv = createNamespaceKv("test-namespace");
      expect(nsKv).toBeDefined();
      expect(nsKv.namespace).toBe("test-namespace");
    });
  });
});
