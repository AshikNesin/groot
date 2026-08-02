import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import { zodToTypeBox } from "@groot/ai";

describe("zodToTypeBox", () => {
  it("converts primitives", () => {
    expect(zodToTypeBox(z.string())).toEqual({ type: "string" });
    expect(zodToTypeBox(z.number())).toEqual({ type: "number" });
    expect(zodToTypeBox(z.boolean())).toEqual({ type: "boolean" });
  });

  it("carries descriptions", () => {
    expect(zodToTypeBox(z.string().describe("a name"))).toEqual({
      type: "string",
      description: "a name",
    });
  });

  it("converts objects, arrays, enums, nullable and defaults (zod 4)", () => {
    const out =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      zodToTypeBox(
        z.object({
          name: z.string(),
          tags: z.array(z.string()).optional(),
          kind: z.enum(["a", "b"]),
          note: z.string().nullable(),
          count: z.number().default(3),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any;

    expect(out.type).toBe("object");
    expect(out.properties.name).toEqual({ type: "string" });
    expect(out.properties.tags).toMatchObject({ type: "array", items: { type: "string" } });
    expect(out.properties.kind).toMatchObject({ anyOf: [{ const: "a" }, { const: "b" }] });
    expect(out.properties.note).toMatchObject({ anyOf: [{ type: "string" }, { type: "null" }] });
    expect(out.properties.count).toEqual({ type: "number" });
  });

  it("unwraps transforms to their input schema", () => {
    expect(zodToTypeBox(z.string().transform((s) => s.length))).toEqual({ type: "string" });
  });
});
