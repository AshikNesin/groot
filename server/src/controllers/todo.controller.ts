import type { Request, Response } from "express";
import { BaseController } from "@/core/base-controller";
import { ResponseHandler } from "@/core/response-handler";
import { asyncHandler } from "@/core/async-handler";
import { todoService } from "@/services/todo.service";
import type { CreateTodoDTO, UpdateTodoDTO } from "@/validations/todo.validation";

class TodoController extends BaseController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const payload = (req.validated?.body || req.body) as CreateTodoDTO;
    const todo = await todoService.create(payload);
    ResponseHandler.created(res, todo, "Todo created successfully");
  });

  getAll = asyncHandler(async (_req: Request, res: Response) => {
    const todos = await todoService.findAll();
    ResponseHandler.success(res, todos);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = this.parseId(req.params.id);
    const todo = await todoService.findById(id);
    ResponseHandler.success(res, todo);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const id = this.parseId(req.params.id);
    const payload = (req.validated?.body || req.body) as UpdateTodoDTO;
    const todo = await todoService.update(id, payload);
    ResponseHandler.success(res, todo, "Todo updated successfully");
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = this.parseId(req.params.id);
    await todoService.delete(id);
    ResponseHandler.success(res, null, "Todo deleted successfully");
  });
}

export const todoController = new TodoController();
