import type { Request, Response } from "express";
import { BaseController } from "@/core/base-controller";
import { ResponseHandler } from "@/core/response-handler";
import { todoService } from "@/app/services/todo.service";
import type { CreateTodoDTO, UpdateTodoDTO } from "@/app/validations/todo.validation";

class TodoController extends BaseController {
  async create(req: Request, res: Response) {
    const payload = (req.validated?.body || req.body) as CreateTodoDTO;
    const todo = await todoService.create(payload);
    ResponseHandler.created(res, todo, "Todo created successfully");
  }

  async getAll(_req: Request, res: Response) {
    const todos = await todoService.findAll();
    ResponseHandler.success(res, todos);
  }

  async getById(req: Request, res: Response) {
    const id = this.parseId(req.params.id);
    const todo = await todoService.findById(id);
    ResponseHandler.success(res, todo);
  }

  async update(req: Request, res: Response) {
    const id = this.parseId(req.params.id);
    const payload = (req.validated?.body || req.body) as UpdateTodoDTO;
    const todo = await todoService.update(id, payload);
    ResponseHandler.success(res, todo, "Todo updated successfully");
  }

  async delete(req: Request, res: Response) {
    const id = this.parseId(req.params.id);
    await todoService.delete(id);
    ResponseHandler.success(res, null, "Todo deleted successfully");
  }
}

export const todoController = new TodoController();
