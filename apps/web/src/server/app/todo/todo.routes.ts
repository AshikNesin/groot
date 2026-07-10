import { createRouter } from "@groot/server/core/utils/router.utils";
import * as todoController from "./todo.controller";
import { validateBody } from "@groot/server/core/middlewares/validation.middleware";
import { createTodoSchema, updateTodoSchema } from "./todo.validation";

const router = createRouter();

router.get("/", todoController.getAll);
router.post("/", validateBody(createTodoSchema), todoController.create);
router.get("/:id", todoController.getById);
router.put("/:id", validateBody(updateTodoSchema), todoController.update);
router.delete("/:id", todoController.deleteTodo);

export default router;
