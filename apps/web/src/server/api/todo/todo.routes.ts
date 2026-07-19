import type { Request, Response } from "express";
import { createRouter } from "@groot/core/utils/router.utils";
import { parseId, parseBody } from "@groot/core/utils/controller.utils";
import * as todoService from "./todo.service";
import { createTodoSchema, updateTodoSchema } from "./todo.schema";

const router = createRouter();

router.post("/", async (req: Request, res: Response) => {
  const payload = parseBody(req, createTodoSchema);
  res.status(201);
  return await todoService.create({ data: payload });
});

router.get("/", async () => {
  return await todoService.findAll();
});

router.get("/:id", async (req: Request) => {
  const id = parseId(req.params.id);
  return await todoService.findById({ id });
});

router.put("/:id", async (req: Request) => {
  const id = parseId(req.params.id);
  const payload = parseBody(req, updateTodoSchema);
  return await todoService.update({ id, data: payload });
});

router.delete("/:id", async (req: Request) => {
  const id = parseId(req.params.id);
  return await todoService.deleteTodo({ id });
});

export default router;
