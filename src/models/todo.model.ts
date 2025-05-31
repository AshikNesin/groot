import { PrismaClient, Todo } from '../generated/prisma';

const prisma = new PrismaClient();

export const create = async (title: string): Promise<Todo> => {
  return prisma.todo.create({
    data: {
      title,
    },
  });
};

export const findAll = async (): Promise<Todo[]> => {
  return prisma.todo.findMany();
};

export const findById = async (id: number): Promise<Todo | null> => {
  return prisma.todo.findUnique({
    where: { id },
  });
};

export const update = async (
  id: number,
  data: { title?: string; completed?: boolean }
): Promise<Todo | null> => {
  return prisma.todo.update({
    where: { id },
    data,
  });
};

export const remove = async (id: number): Promise<Todo | null> => {
  return prisma.todo.delete({
    where: { id },
  });
};
