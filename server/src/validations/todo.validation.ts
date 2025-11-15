import { z } from "zod";

export const createTodoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  completed: z.boolean().optional().default(false),
});

export const updateTodoSchema = createTodoSchema.partial();

export type CreateTodoDTO = z.infer<typeof createTodoSchema>;
export type UpdateTodoDTO = z.infer<typeof updateTodoSchema>;
