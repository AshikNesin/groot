import { prisma } from "@groot/core/database";
import { Boom } from "@groot/core/errors";
import type { CreateTodoDTO, UpdateTodoDTO } from "./todo.validation";

export async function create({ data }: { data: CreateTodoDTO }) {
  return prisma.todo.create({ data });
}

export async function findAll() {
  return prisma.todo.findMany({ orderBy: { createdAt: "desc" } });
}

export async function findById({ id }: { id: number }) {
  const todo = await prisma.todo.findUnique({ where: { id } });
  if (!todo) {
    throw Boom.notFound("Todo not found");
  }
  return todo;
}

export async function update({ id, data }: { id: number; data: UpdateTodoDTO }) {
  await findById({ id });
  return prisma.todo.update({ where: { id }, data });
}

export async function deleteTodo({ id }: { id: number }) {
  await findById({ id });
  return prisma.todo.delete({ where: { id } });
}
