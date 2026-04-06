import { createRouter } from "@/core/utils/router.utils";
import * as todoController from "./todo.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import { createTodoSchema, updateTodoSchema } from "./todo.validation";

const router = createRouter();

router.get("/", todoController.getAll);
router.post("/", validate(createTodoSchema, "body"), todoController.create);
router.get("/:id", todoController.getById);
router.put("/:id", validate(updateTodoSchema, "body"), todoController.update);
router.delete("/:id", todoController.deleteTodo);

export default router;
