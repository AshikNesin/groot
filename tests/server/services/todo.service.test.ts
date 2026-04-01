import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import { todoService } from "@/features/todo/todo.service";
import { todoModel } from "@/features/todo/todo.model";

vi.mock("@/features/todo/todo.model", () => {
  return {
    todoModel: {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockedTodoModel = todoModel as unknown as {
  create: vi.Mock;
  findAll: vi.Mock;
  findById: vi.Mock;
  update: vi.Mock;
  delete: vi.Mock;
};

describe("TodoService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a todo", async () => {
    mockedTodoModel.create.mockResolvedValue({
      id: 1,
      title: "New todo",
      completed: false,
    });

    const todo = await todoService.create({ title: "New todo" });

    expect(todo).toMatchObject({ id: 1, title: "New todo" });
    expect(mockedTodoModel.create).toHaveBeenCalledWith({ title: "New todo" });
  });

  it("throws when todo is not found", async () => {
    mockedTodoModel.findById.mockResolvedValue(null);

    await expect(todoService.findById(123)).rejects.toThrow("Todo not found");
  });

  it("deletes an existing todo", async () => {
    mockedTodoModel.findById.mockResolvedValue({
      id: 1,
      title: "Todo",
      completed: false,
    });
    mockedTodoModel.delete.mockResolvedValue({ id: 1 });

    await todoService.delete(1);

    expect(mockedTodoModel.delete).toHaveBeenCalledWith(1);
  });
});
