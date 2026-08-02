import { describe, expect, it } from "vite-plus/test";
import { stringifyWithLinks } from "@groot/jobs/client/components/JobJsonBlock";

describe("stringifyWithLinks", () => {
  it("pretty-prints JSON and marks nested linkable values", () => {
    const result = stringifyWithLinks(
      {
        title: "Example",
        nested: { todoId: "todo-123" },
        items: [{ todoId: "todo-456" }],
      },
      (key, value) => (key === "todoId" ? { to: `/todos/${String(value)}` } : null),
    );

    expect(result.json).toBe(
      `{\n  "title": "Example",\n  "nested": {\n    "todoId": "todo-123"\n  },\n  "items": [\n    {\n      "todoId": "todo-456"\n    }\n  ]\n}`,
    );
    expect(result.linkRanges).toEqual([
      {
        from: result.json.indexOf('"todo-123"'),
        to: result.json.indexOf('"todo-123"') + '"todo-123"'.length,
        href: "/todos/todo-123",
      },
      {
        from: result.json.indexOf('"todo-456"'),
        to: result.json.indexOf('"todo-456"') + '"todo-456"'.length,
        href: "/todos/todo-456",
      },
    ]);
  });

  it("does not mark values when the resolver returns no link", () => {
    const result = stringifyWithLinks({ id: "todo-123" }, () => null);

    expect(result.linkRanges).toEqual([]);
  });
});
