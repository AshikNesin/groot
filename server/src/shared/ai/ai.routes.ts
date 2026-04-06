import { createRouter } from "@/core/utils/router.utils";
import * as aiController from "@/shared/ai/ai.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import { askSchema, summarizeSchema, translateSchema } from "@/shared/ai/ai.validation";

const router = createRouter();

router.post("/ask", validate(askSchema), aiController.ask);
router.post("/summarize", validate(summarizeSchema), aiController.summarize);
router.post("/translate", validate(translateSchema), aiController.translate);

export default router;
