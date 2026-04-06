import { todoModel } from "./todo.model";
import { Boom } from "@/core/errors";
import type { CreateTodoDTO, UpdateTodoDTO } from "./todo.validation";

export async function create({ data }: { data: CreateTodoDTO }) {
  return todoModel.create(data);
}

export async function findAll() {
  return todoModel.findAll();
}

export async function findById({ id }: { id: number }) {
  const todo = await todoModel.findById(id);
  if (!todo) {
    throw Boom.notFound("Todo not found");
  }
  return todo;
}

export async function update({ id, data }: { id: number; data: UpdateTodoDTO }) {
  await findById({ id });
  return todoModel.update(id, data);
}

export async function deleteTodo({ id }: { id: number }) {
  await findById({ id });
  return todoModel.delete(id);
}
