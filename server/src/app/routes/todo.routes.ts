import { Router } from "express";
import { todoController } from "@/app/controllers/todo.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import { createTodoSchema, updateTodoSchema } from "@/app/validations/todo.validation";

const router = Router();

router.post("/", validate(createTodoSchema), (req, res) => todoController.create(req, res));
router.get("/", (req, res) => todoController.getAll(req, res));
router.get("/:id", (req, res) => todoController.getById(req, res));
router.put("/:id", validate(updateTodoSchema), (req, res) => todoController.update(req, res));
router.delete("/:id", (req, res) => todoController.delete(req, res));

export default router;
