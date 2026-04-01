import { Router } from "express";
import { todoController } from "@/features/todo/todo.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import { createTodoSchema, updateTodoSchema } from "@/features/todo/todo.validation";

const router = Router();

router.post("/", validate(createTodoSchema), todoController.create);
router.get("/", todoController.getAll);
router.get("/:id", todoController.getById);
router.put("/:id", validate(updateTodoSchema), todoController.update);
router.delete("/:id", todoController.delete);

export default router;
