import { prisma } from "@/core/database";

export class TodoModel {
  create(data: { title: string; completed?: boolean }) {
    return prisma.todo.create({ data });
  }

  findAll() {
    return prisma.todo.findMany({ orderBy: { createdAt: "desc" } });
  }

  findById(id: number) {
    return prisma.todo.findUnique({ where: { id } });
  }

  update(id: number, data: Partial<{ title: string; completed?: boolean }>) {
    return prisma.todo.update({ where: { id }, data });
  }

  delete(id: number) {
    return prisma.todo.delete({ where: { id } });
  }
}

export const todoModel = new TodoModel();
