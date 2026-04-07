import { createRouter } from "@/core/utils/router.utils";
import * as todoController from "@/app/todo/todo.controller";
import { validateBody } from "@/core/middlewares/validation.middleware";
import { createTodoSchema, updateTodoSchema } from "@/app/todo/todo.validation";

const router = createRouter();

router.get("/", todoController.getAll);
router.post("/", validateBody(createTodoSchema), todoController.create);
router.get("/:id", todoController.getById);
router.put("/:id", validateBody(updateTodoSchema), todoController.update);
router.delete("/:id", todoController.deleteTodo);

export default router;
