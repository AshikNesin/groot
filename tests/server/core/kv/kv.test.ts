import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createNamespaceKv } from "@/core/kv";
import Keyv from "keyv";

// Mock the Prisma client for testing - use vi.hoisted to avoid initialization order issues
const mockPrisma = vi.hoisted(() => ({
  keyv: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@/core/database", () => ({
  prisma: mockPrisma,
}));

// Import after mocking
const { KeyvPrismaAdapter } = await import("@/core/kv/keyv-prisma-adapter");

describe("KV System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Namespaced KV", () => {
    it("should create a namespaced KV instance", () => {
      const nsKv = createNamespaceKv("test-namespace");
      expect(nsKv).toBeDefined();
      // Check that the namespace is set by looking at the internal options
      expect(nsKv.namespace).toBe("test-namespace");
    });
  });

  describe("KeyvPrismaAdapter", () => {
    let adapter: KeyvPrismaAdapter;

    beforeEach(() => {
      adapter = new KeyvPrismaAdapter({ namespace: "test-adapter" });
    });

    it("should create adapter with default options", () => {
      const defaultAdapter = new KeyvPrismaAdapter();
      expect(defaultAdapter).toBeDefined();
    });

    it("should create adapter with custom options", () => {
      const customAdapter = new KeyvPrismaAdapter({
        namespace: "custom-namespace",
        prisma: mockPrisma,
      });
      expect(customAdapter).toBeDefined();
    });

    it("should generate namespaced keys correctly", () => {
      // Access private method through type assertion for testing
      const adapterWithKey = adapter as KeyvPrismaAdapter & {
        getKey(key: string): string;
      };
      expect(adapterWithKey.getKey("test")).toBe("test-adapter:test");

      // Test without namespace
      const noNsAdapter = new KeyvPrismaAdapter({ namespace: undefined });
      const noNamespace = noNsAdapter as KeyvPrismaAdapter & {
        getKey(key: string): string;
      };
      expect(noNamespace.getKey("test")).toBe("test");
    });

    it("should get a value that exists", async () => {
      const mockValue = { value: '{"name":"test"}' };
      mockPrisma.keyv.findUnique.mockResolvedValue(mockValue);

      const result = await adapter.get("test-key");
      expect(result).toEqual({ name: "test" });
      expect(mockPrisma.keyv.findUnique).toHaveBeenCalledWith({
        where: { key: "test-adapter:test-key" },
      });
    });

    it("should return undefined for non-existent keys", async () => {
      mockPrisma.keyv.findUnique.mockResolvedValue(null);

      const result = await adapter.get("non-existent-key");
      expect(result).toBeUndefined();
    });

    it("should handle non-JSON values", async () => {
      const mockValue = { value: "plain string value" };
      mockPrisma.keyv.findUnique.mockResolvedValue(mockValue);

      const result = await adapter.get("test-key");
      expect(result).toBe("plain string value");
    });

    it("should set a value", async () => {
      mockPrisma.keyv.upsert.mockResolvedValue({});

      await adapter.set("test-key", { data: "test" });

      expect(mockPrisma.keyv.upsert).toHaveBeenCalledWith({
        where: { key: "test-adapter:test-key" },
        update: { value: '{"data":"test"}' },
        create: { key: "test-adapter:test-key", value: '{"data":"test"}' },
      });
    });

    it("should handle string values directly", async () => {
      mockPrisma.keyv.upsert.mockResolvedValue({});

      await adapter.set("test-key", "string value");

      expect(mockPrisma.keyv.upsert).toHaveBeenCalledWith({
        where: { key: "test-adapter:test-key" },
        update: { value: "string value" },
        create: { key: "test-adapter:test-key", value: "string value" },
      });
    });

    it("should delete a key", async () => {
      mockPrisma.keyv.delete.mockResolvedValue({
        key: "test-adapter:test-key",
      });

      const result = await adapter.delete("test-key");

      expect(result).toBe(true);
      expect(mockPrisma.keyv.delete).toHaveBeenCalledWith({
        where: { key: "test-adapter:test-key" },
      });
    });

    it("should return false when deleting non-existent key", async () => {
      mockPrisma.keyv.delete.mockRejectedValue(new Error("Record not found"));

      const result = await adapter.delete("non-existent-key");

      expect(result).toBe(false);
    });

    it("should clear all entries in namespace", async () => {
      mockPrisma.keyv.deleteMany.mockResolvedValue({ count: 5 });

      await adapter.clear();

      expect(mockPrisma.keyv.deleteMany).toHaveBeenCalledWith({
        where: {
          key: {
            startsWith: "test-adapter:",
          },
        },
      });
    });

    it("should clear all entries when no namespace", async () => {
      const noNsAdapter = new KeyvPrismaAdapter({ namespace: undefined });
      mockPrisma.keyv.deleteMany.mockResolvedValue({ count: 10 });

      await noNsAdapter.clear();

      expect(mockPrisma.keyv.deleteMany).toHaveBeenCalledWith({});
    });

    it("should get many values", async () => {
      const mockRecords = [
        { key: "test-adapter:key1", value: '"value1"' },
        { key: "test-adapter:key2", value: '"value2"' },
      ];
      mockPrisma.keyv.findMany.mockResolvedValue(mockRecords);

      const results = await adapter.getMany(["key1", "key2", "key3"]);

      expect(results).toEqual(["value1", "value2", undefined]);
      expect(mockPrisma.keyv.findMany).toHaveBeenCalledWith({
        where: {
          key: {
            in: ["test-adapter:key1", "test-adapter:key2", "test-adapter:key3"],
          },
        },
      });
    });

    it("should check if key exists", async () => {
      mockPrisma.keyv.findUnique.mockResolvedValue({ value: '"exists"' });

      const result = await adapter.has("test-key");

      expect(result).toBe(true);
      expect(mockPrisma.keyv.findUnique).toHaveBeenCalledWith({
        where: { key: "test-adapter:test-key" },
      });
    });

    it("should check if non-existent key exists", async () => {
      mockPrisma.keyv.findUnique.mockResolvedValue(null);

      const result = await adapter.has("non-existent-key");

      expect(result).toBe(false);
    });

    it("should disconnect gracefully", async () => {
      // Should not throw any errors
      await adapter.disconnect();
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      const adapter = new KeyvPrismaAdapter({ namespace: "error-test" });
      mockPrisma.keyv.findUnique.mockRejectedValue(new Error("Database error"));

      // Should reject with error
      await expect(adapter.get("test-key")).rejects.toThrow("Database error");
    });
  });
});
