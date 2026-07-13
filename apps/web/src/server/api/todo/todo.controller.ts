import type { Request, Response } from "express";
import * as TodoService from "./todo.service";
import { createTodoSchema, updateTodoSchema } from "./todo.validation";
import { parseId, parseBody } from "@groot/core/utils/controller.utils";

export async function create(req: Request, res: Response) {
  const payload = parseBody(req, createTodoSchema);
  res.status(201);
  return await TodoService.create({ data: payload });
}

export async function getAll() {
  return await TodoService.findAll();
}

export async function getById(req: Request) {
  const id = parseId(req.params.id);
  return await TodoService.findById({ id });
}

export async function update(req: Request) {
  const id = parseId(req.params.id);
  const payload = parseBody(req, updateTodoSchema);
  return await TodoService.update({ id, data: payload });
}

export async function deleteTodo(req: Request) {
  const id = parseId(req.params.id);
  await TodoService.deleteTodo({ id });
}
