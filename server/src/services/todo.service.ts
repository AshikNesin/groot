import { todoModel } from "@/models/todo.model";
import { NotFoundError } from "@/core/errors/base.errors";
import type {
  CreateTodoDTO,
  UpdateTodoDTO,
} from "@/validations/todo.validation";

class TodoService {
  create(data: CreateTodoDTO) {
    return todoModel.create(data);
  }

  findAll() {
    return todoModel.findAll();
  }

  async findById(id: number) {
    const todo = await todoModel.findById(id);
    if (!todo) {
      throw new NotFoundError("Todo not found");
    }
    return todo;
  }

  async update(id: number, data: UpdateTodoDTO) {
    await this.findById(id);
    return todoModel.update(id, data);
  }

  async delete(id: number) {
    await this.findById(id);
    return todoModel.delete(id);
  }
}

export const todoService = new TodoService();
