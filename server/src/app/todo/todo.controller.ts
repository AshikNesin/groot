import type { Request, Response } from "express";
import { ResponseHandler } from "@/core/response-handler";
import * as TodoService from "./todo.service";
import type { CreateTodoDTO, UpdateTodoDTO } from "./todo.validation";
import { parseId } from "@/core/utils/controller.utils";

export async function create(req: Request, res: Response): Promise<void> {
  const payload = (req.validated?.body || req.body) as CreateTodoDTO;
  const todo = await TodoService.create({ data: payload });
  ResponseHandler.created(res, todo, "Todo created successfully");
}

export async function getAll(_req: Request, res: Response): Promise<void> {
  const todos = await TodoService.findAll();
  ResponseHandler.success(res, todos);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  const todo = await TodoService.findById({ id });
  ResponseHandler.success(res, todo);
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  const payload = (req.validated?.body || req.body) as UpdateTodoDTO;
  const todo = await TodoService.update({ id, data: payload });
  ResponseHandler.success(res, todo, "Todo updated successfully");
}

export async function deleteTodo(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  await TodoService.deleteTodo({ id });
  ResponseHandler.success(res, null, "Todo deleted successfully");
}
