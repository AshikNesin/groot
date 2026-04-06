import { Router } from "express";
import * as todoController from "./todo.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import { createTodoSchema, updateTodoSchema } from "@/app/todo/todo.validation";
import { handle } from "@/core/middlewares/route-handler.middleware";

const router = Router();

router.post("/", validate(createTodoSchema), handle(todoController.create));
router.get("/", handle(todoController.getAll));
router.get("/:id", handle(todoController.getById));
router.put("/:id", validate(updateTodoSchema), handle(todoController.update));
router.delete("/:id", handle(todoController.deleteTodo));
router.delete("/:id", todoController.deleteTodo);

export default router;
