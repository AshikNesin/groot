import type { Request, Response } from "express";
import * as TodoService from "./todo.service";
import type { CreateTodoDTO, UpdateTodoDTO } from "./todo.validation";
import { parseId } from "@/core/utils/controller.utils";

export async function create(req: Request, res: Response) {
  const payload = (req.validated?.body || req.body) as CreateTodoDTO;
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
  const payload = (req.validated?.body || req.body) as UpdateTodoDTO;
  return await TodoService.update({ id, data: payload });
}

export async function deleteTodo(req: Request) {
  const id = parseId(req.params.id);
  await TodoService.deleteTodo({ id });
}
