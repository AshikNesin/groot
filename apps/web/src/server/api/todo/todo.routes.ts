import type { Request, Response } from "express";
import { createRouter } from "@groot/core/utils/router.utils";
import { parseId, parseBody } from "@groot/core/utils/controller.utils";
import * as TodoService from "./todo.service";
import { createTodoSchema, updateTodoSchema } from "./todo.validation";

const router = createRouter();

router.post("/", async (req: Request, res: Response) => {
  const payload = parseBody(req, createTodoSchema);
  res.status(201);
  return await TodoService.create({ data: payload });
});

router.get("/", async () => {
  return await TodoService.findAll();
});

router.get("/:id", async (req: Request) => {
  const id = parseId(req.params.id);
  return await TodoService.findById({ id });
});

router.put("/:id", async (req: Request) => {
  const id = parseId(req.params.id);
  const payload = parseBody(req, updateTodoSchema);
  return await TodoService.update({ id, data: payload });
});

router.delete("/:id", async (req: Request) => {
  const id = parseId(req.params.id);
  return await TodoService.deleteTodo({ id });
});

export default router;
