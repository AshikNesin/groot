import { createRouter } from "@groot/core/utils/router.utils";
import * as todoController from "./todo.controller";

const router = createRouter();

router.get("/", todoController.getAll);
router.post("/", todoController.create);
router.get("/:id", todoController.getById);
router.put("/:id", todoController.update);
router.delete("/:id", todoController.deleteTodo);

export default router;
